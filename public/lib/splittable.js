/*global MM, jQuery*/

jQuery.fn.splittableWidget = function (splittableController, minTop) {
	'use strict';
	var element = jQuery(this),
		defaultArea = element.find('[data-mm-role=default]'),
		optionalArea = element.find('[data-mm-role=optional]'),
		doSplit = function (position) {
			var optionalAreaCss,
				defaultAreaCss,
				wasVisible;
			if (position === MM.SplittableController.COLUMN_SPLIT) {
				optionalAreaCss = {
					'top': minTop,
					'left': '50%',
					'width': '50%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block',
					'position': 'absolute'
				};
				defaultAreaCss = {
					'top': minTop,
					'left': 0,
					'width': '50%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block',
				};
			} else if (position === MM.SplittableController.ROW_SPLIT) {
				optionalAreaCss = {
					'top': '50%',
					'left': 0,
					'width': '100%',
					'height': '50%',
					'min-height': 0,
					'display': 'block',
					'position': 'inherit'
				};
				defaultAreaCss = {
					'top': 0,
					'left': 0,
					'width': '100%',
					'height': '50%',
					'min-height': 0,
					'display': 'block'
				};
			} else {
				optionalAreaCss = {
					'display': 'none'
				};
				defaultAreaCss = {
					'top': 0,
					'left': 0,
					'width': '100%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block'
				};
			}
			wasVisible = optionalArea.is(':visible');
			defaultArea.css(defaultAreaCss);
			optionalArea.css(optionalAreaCss);
			if (optionalArea.is(':visible') && !wasVisible) {
				optionalArea.trigger('show');
			} else if (!optionalArea.is(':visible') && wasVisible) {
				optionalArea.trigger('hide');
			}
		};
	splittableController.addEventListener('split', doSplit);
	doSplit(splittableController.currentSplit());
	return element;
};
