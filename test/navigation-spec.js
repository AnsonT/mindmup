/*global beforeEach, afterEach, describe, expect, it, MM, $, spyOn, jasmine*/
describe('MM.navigation', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		underTest = new MM.navigation({mapId: 'mapIdInConfig'});
	});
	afterEach(function () {
		window.removeEventListener('mapIdChanged');
		window.location.hash = '';
	});
	describe('currentMapId', function () {
		it('should return mapId from window address hash', function () {
			window.location.hash = 'm:mapIdInHash';
			expect(underTest.currentMapId()).toBe('mapIdInHash');
		});
		it('should return mapId from config if there is no window address hash', function () {
			window.location.hash = '';
			expect(underTest.currentMapId()).toBe('mapIdInConfig');
		});
		it('should ignore window address hash if it does not match format', function () {
			window.location.hash = 'mapIdInHash';
			expect(underTest.currentMapId()).toBe('mapIdInConfig');
		});
		it('should return default as fallback', function () {
			window.location.hash = '';
			underTest = new MM.navigation({});
			expect(underTest.currentMapId()).toBe('default');
		});

	});
	describe('wireLinkForMapId', function () {
		var link;
		beforeEach(function () {
			link = $('<a>');
		});
		it('should return link', function () {
			underTest.wireLinkForMapId('newMapId', link);
		});
		describe('when mapId is from window address hash', function () {
			beforeEach(function () {
				window.location.hash = 'm:mapIdInHash';
			});
			afterEach(function () {
				window.location.hash = '';
			});
			it('should set # as href', function () {
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.attr('href')).toBe('#m:newMapId');
			});
		});
		describe('when there is no window address hash', function () {
			beforeEach(function () {
				window.location.hash = '';
			});
			it('should set /m#m:newMapId as href', function () {
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.attr('href')).toBe('/m#m:newMapId');
			});
			it('should not set click event', function () {
				spyOn(link, 'click').andCallThrough();
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.click).not.toHaveBeenCalled();
			});
		});
	});
	describe('confirmationRequired', function () {
		it('should return false', function () {
			expect(underTest.confirmationRequired()).toBe(false);
		});
		it('should return true or false once set', function () {
			expect(underTest.confirmationRequired(true)).toBe(true);
			expect(underTest.confirmationRequired()).toBe(true);
			expect(underTest.confirmationRequired(false)).toBe(false);
			expect(underTest.confirmationRequired()).toBe(false);
		});

	});
	describe('changeMapId', function () {
		describe('when mapId is from window address hash', function () {
			var listener;
			beforeEach(function () {
				window.location.hash = 'm:mapIdInHash';
				underTest = new MM.navigation({mapId: 'mapIdInConfig'});
				listener = jasmine.createSpy();
				underTest.addEventListener('mapIdChanged', listener);
			});
			it('should return true when mapId is not the same', function () {
				expect(underTest.changeMapId('newMapId')).toBe(true);
			});
			it('should set window address hash to new mapId', function () {
				underTest.changeMapId('newMapId');
				expect(window.location.hash).toBe('#m:newMapId');
			});
			it('should notify listeners of newMapId', function () {
				underTest.changeMapId('newMapId');
				expect(listener).toHaveBeenCalledWith('newMapId', 'mapIdInHash');
			});
			it('should return false when mapId is the same', function () {
				expect(underTest.changeMapId('mapIdInHash')).toBe(false);
				expect(window.location.hash).toBe('#m:mapIdInHash');
				expect(listener).not.toHaveBeenCalled();
			});
			it('should notify listeners when confirmation required', function () {
				var confirmationListener = jasmine.createSpy();
				underTest.confirmationRequired(true);
				underTest.addEventListener('mapIdChangeConfirmationRequired', confirmationListener);
				underTest.changeMapId('newMapId');
				expect(confirmationListener).toHaveBeenCalledWith('newMapId');
			});
			it('should not notify listeners when confirmation required but forced', function () {
				var confirmationListener = jasmine.createSpy();
				underTest.confirmationRequired(true);
				underTest.addEventListener('mapIdChangeConfirmationRequired', confirmationListener);
				underTest.changeMapId('newMapId', true);
				expect(confirmationListener).not.toHaveBeenCalledWith('newMapId');
			});
		});
		describe('when there is no window address hash', function () {
			beforeEach(function () {
				window.location.hash = '';
				underTest = new MM.navigation({mapId: 'mapIdInConfig'});
			});
			it('should return false when mapId is the same', function () {
				expect(underTest.changeMapId('mapIdInConfig')).toBe(false);
				expect(window.location.hash).toBe('');
			});
		});
	});
});