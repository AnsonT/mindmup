/*global MM, observable, $, _*/
MM.navigation = function (config, chromeApp, baseUrl) {
	'use strict';
	observable(this);
	var self = this,
		mapIdRegEx = /[Mm]:([^,;#]*)/,
		getMapIdFromHash = function () {
			var windowHash = window && window.location && window.location.hash,
				found = windowHash && mapIdRegEx.exec(windowHash);
			return found && found[1];
		},
		calcCurrentMapId = function () {
			return getMapIdFromHash() || config.mapId || 'default';
		},
		hashMapId = function (mapId) {
			return 'm:' + mapId;
		},
		useHash = function () {
			return !config.mapId || getMapIdFromHash() || chromeApp;
		},
		currentMapId = calcCurrentMapId(),
		confirmationRequired = false;
	self.useHash = useHash;
	self.confirmationRequired = function (val) {
		if (val === undefined) {
			return confirmationRequired;
		}
		confirmationRequired = val ? true : false;
		return confirmationRequired;
	};
	self.sharingUrl = function () {
		return baseUrl + 'map/' + self.currentMapId();
	};

	self.hashMapId = hashMapId;
	self.currentMapId = calcCurrentMapId;
	self.wireLinkForMapId = function (newMapId, link) {
		if (useHash()) {
			link.attr('href', '#' + hashMapId(newMapId));
			link.data('link-fixed', 'true');
			link.click(function () {self.changeMapId(newMapId); });
		} else {
			link.attr('href', '/map/' + newMapId);
		}
		return link;
	};
	self.setSimpleLink = function (link) {
		if (useHash() && !$(link).data('link-fixed')) {
			$(link).attr('href', '#' +  hashMapId(calcCurrentMapId()));
		}
	};
	self.changeMapId = function (newMapId, force) {
		if (newMapId && currentMapId && newMapId === currentMapId) {
			return false;
		}
		var previousMapId = currentMapId || calcCurrentMapId();
		if (useHash()) {
			if (confirmationRequired && !force) {
				self.dispatchEvent('mapIdChangeConfirmationRequired', newMapId);
			} else {
				currentMapId = newMapId;
				window.location.hash = hashMapId(newMapId);
				self.dispatchEvent('mapIdChanged', newMapId, previousMapId);
			}
			return true;
		} else {
			if (!newMapId || newMapId === 'nil') {
				return;
			}
			currentMapId = newMapId;
			document.location = '/map/' + newMapId;
		}
	};
	window.addEventListener('hashchange', function () {
		var newMapId = getMapIdFromHash();
		if (!newMapId) {
			return;
		}
		if (!currentMapId || currentMapId !== newMapId) {
			self.changeMapId(newMapId);
		}
	});
	return self;
};

$.fn.navigationWidget = function (navigation) {
	'use strict';
	var self = this,
		mapIdRegEx = /\/[Mm]ap\/([^\/]*)/,
		setSimpleLinks = function (newMapId, previousMapId) {
			_.each(self.find('a[href="#"]'), function (link) {
				navigation.setSimpleLink(link);
			});
			if (previousMapId) {
				_.each(self.find('a[href="#' + navigation.hashMapId(previousMapId) + '"]'), function (link) {
					navigation.setSimpleLink(link);
				});
			}
		};
	_.each(self.find('a'), function (link) {
		var $link = $(link),
			href = $link.attr('href'),
			result = mapIdRegEx.exec(href);
		if (result && result[1]) {
			navigation.wireLinkForMapId(result[1], $link);
		}
	});
	setSimpleLinks(navigation.currentMapId());
	navigation.addEventListener('mapIdChanged', function (newMapId, previousMapId) {
		setSimpleLinks(newMapId, previousMapId);
	});
	return self;
};