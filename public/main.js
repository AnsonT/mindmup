/*jslint nomen: true*/
/*global _gaq, document, jQuery, MM, MAPJS, window*/
MM.main = function (config) {
	'use strict';
	var getStorage = function () {
			try {
				window.localStorage.setItem('testkey', 'testval');
				if (window.localStorage.getItem('testkey') === 'testval') {

					return window.localStorage;
				}
			} catch (e) {
			}
			return {
				fake: true,
				getItem: function (key) { return this[key]; },
				setItem: function (key, val) { this[key] = val; },
				removeItem: function (key) { delete this[key]; }
			};
		},
		browserStorage = getStorage(),
		mapModelAnalytics = false,
		setupTracking = function (activityLog, jotForm, mapModel) {
			activityLog.addEventListener('log', function () { _gaq.push(['_trackEvent'].concat(Array.prototype.slice.call(arguments, 0, 3))); });
			activityLog.addEventListener('error', function (message) {
				jotForm.sendError(message, activityLog.getLog());
			});
			activityLog.addEventListener('timer', function (category, action, time) {
				_gaq.push(['_trackEvent', category,  action, '', time]);
			});
			if (mapModelAnalytics) {
				mapModel.addEventListener('analytic', activityLog.log);
			}
		};
	window._gaq = window._gaq || [];

	window._gaq = [['_setAccount', config.googleAnalyticsAccount],
		['_setCustomVar', 1, 'User Cohort', config.userCohort, 1],
		['_setCustomVar', 2, 'Active Extensions', browserStorage['active-extensions'], 1],
		['_trackPageview']
			].concat(window._gaq);
	jQuery(function () {
		var activityLog = new MM.ActivityLog(10000),
			oldShowPalette,
			s3Api = new MM.S3Api(),
			alert = new MM.Alert(),
			modalConfirm = jQuery('#modalConfirm').modalConfirmWidget(),
			objectStorage = MM.jsonStorage(browserStorage),
			objectClipboard = new MM.LocalStorageClipboard(objectStorage, 'clipboard', alert),
			jotForm = new MM.JotForm(jQuery('#modalFeedback form'), alert),
			ajaxPublishingConfigGenerator = new MM.S3ConfigGenerator(config.s3Url, config.publishingConfigUrl, config.s3Folder),
			goldLicenseManager = new MM.GoldLicenseManager(objectStorage, 'licenseKey'),
			goldApi = new MM.GoldApi(goldLicenseManager, config.goldApiUrl, activityLog, config.goldBucketName),
			goldStorage = new MM.GoldStorage(goldApi, s3Api, modalConfirm),
			s3FileSystem = new MM.S3FileSystem(ajaxPublishingConfigGenerator, 'a', 'S3_CORS'),
			googleDriveAdapter = new MM.GoogleDriveAdapter(config.googleAppId, config.googleClientId, config.googleApiKey, config.networkTimeoutMillis, 'application/json'),
			offlineMapStorage = new MM.OfflineMapStorage(objectStorage, 'offline'),
			offlineAdapter = new MM.OfflineAdapter(offlineMapStorage),
      resourcePrefix = 'internal',
      resourceCompressor = new MM.ResourceCompressor(resourcePrefix),
			mapController = new MM.MapController([
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(s3FileSystem, resourceCompressor.compress)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(goldStorage.fileSystemFor('b'), resourceCompressor.compress)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(goldStorage.fileSystemFor('p'), resourceCompressor.compress)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(googleDriveAdapter, resourceCompressor.compress)),
				new MM.FileSystemMapSource(offlineAdapter),
				new MM.EmbeddedMapSource()
			]),
			activeContentListener = new MM.ActiveContentListener(mapController),
			activeContentResourceManager = new MM.ActiveContentResourceManager(activeContentListener, resourcePrefix),
			navigation = MM.navigation(browserStorage, mapController),
			mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, ['Press Space or double-click to edit'], objectClipboard),
			storyboardModel = new MM.StoryboardModel(activeContentListener, 'storyboards', 'storyboard-scenes'),
			storyboardDimensionProvider = new MM.StoryboardDimensionProvider(activeContentResourceManager),
			layoutExportController = new MM.LayoutExportController({
				'png': MM.buildMapLayoutExporter(mapModel, activeContentResourceManager.getResource),
				'pdf': MM.buildMapLayoutExporter(mapModel, activeContentResourceManager.getResource),
				'presentation.pdf':  MM.buildStoryboardExporter(storyboardModel, storyboardDimensionProvider, activeContentResourceManager.getResource)
			}, goldApi, s3Api, activityLog),
			iconEditor = new MM.iconEditor(mapModel, activeContentResourceManager),
			mapBookmarks = new MM.Bookmark(mapController, objectStorage, 'created-maps'),
			autoSave = new MM.AutoSave(mapController, objectStorage, alert, mapModel),
			stageImageInsertController = new MAPJS.ImageInsertController(config.corsProxyUrl, activeContentResourceManager.storeResource),
			measuresModel = new MM.MeasuresModel('measurements-config', 'measurements', activeContentListener, new MM.MeasuresModel.ActivatedNodesFilter(mapModel)),
			splittableController = new MM.SplittableController(jQuery('body'), mapModel, browserStorage, 'splittableController', 'measuresSheet'),
			customStyleController = new MM.CustomStyleController(activeContentListener, mapModel),
			storyboardController = new MM.StoryboardController(storyboardModel),
			extensions = new MM.Extensions(browserStorage, 'active-extensions', config, {
				'googleDriveAdapter': googleDriveAdapter,
				'alert': alert,
				'mapController': mapController,
				'activityLog': activityLog,
				'mapModel': mapModel,
				'container': jQuery('#container'),
				'iconEditor': iconEditor,
				'measuresModel' : measuresModel,
				'activeContentListener': activeContentListener,
				'navigation': navigation
			}),
			loadWidgets = function () {
				var isTouch = jQuery('body').hasClass('ios') || jQuery('body').hasClass('android');
				if (isTouch) {
					jQuery('[data-mm-role-touch]').attr('data-mm-role', function () {
						return jQuery(this).attr('data-mm-role-touch');
					});
				} else {
					jQuery('[rel=tooltip]').tooltip();
				}

				MAPJS.DOMRender.stageVisibilityMargin = {top: 50, left: 10, bottom: 20, right: 20};
				MAPJS.DOMRender.stageMargin = {top: 50, left: 50, bottom: 50, right: 50};


				jQuery('[data-mm-layout][data-mm-layout!=' + config.layout + ']').remove();
				jQuery('body').mapStatusWidget(mapController, activeContentListener);
				jQuery('#container').domMapWidget(activityLog, mapModel, isTouch, stageImageInsertController, jQuery('#splittable'), activeContentResourceManager.getResource).storyboardKeyHandlerWidget(storyboardController, storyboardModel, mapModel, '+');
				jQuery('#welcome_message[data-message]').welcomeMessageWidget(activityLog);
				jQuery('#topbar').mapToolbarWidget(mapModel);
				oldShowPalette = jQuery.fn.colorPicker.showPalette;
				jQuery.fn.colorPicker.showPalette = function (palette) {
					oldShowPalette(palette);
					if (palette.hasClass('topbar-color-picker')) {
						palette.css('top', jQuery('#topbar').outerHeight());
					}
				};
				jQuery('#modalFeedback').feedbackWidget(jotForm, activityLog);
				jQuery('#modalVote').voteWidget(activityLog, alert);
				jQuery('#toolbarEdit').mapToolbarWidget(mapModel);
				jQuery('#floating-toolbar').floatingToolbarWidget();
				jQuery('#listBookmarks').bookmarkWidget(mapBookmarks, alert, mapController);
				jQuery(document).titleUpdateWidget(mapController);

				jQuery('[data-mm-role=share]').shareWidget();
				jQuery('#modalShareEmail').shareEmailWidget();
				jQuery('[data-mm-role=share-google]').googleShareWidget(mapController, googleDriveAdapter);
				jQuery('[data-mm-role=share]').add('[data-mm-role=short-url]').urlShortenerWidget(config.googleApiKey, activityLog, mapController, config.baseUrl);
				jQuery('#modalImport').importWidget(activityLog, mapController);
				jQuery('[data-mm-role=save]').saveWidget(mapController);
				jQuery('[data-mm-role="toggle-class"]').toggleClassWidget();
				jQuery('[data-mm-role="remote-export"]').remoteExportWidget(mapController, alert, measuresModel, goldApi, s3Api, modalConfirm);
				jQuery('[data-mm-role=layout-export]').layoutExportWidget(layoutExportController);
				jQuery('[data-mm-role~=google-drive-open]').googleDriveOpenWidget(googleDriveAdapter, mapController, modalConfirm, activityLog);
				jQuery('#modalLocalStorageOpen').localStorageOpenWidget(offlineMapStorage, mapController);
				jQuery('#modalGoldStorageOpen').goldStorageOpenWidget(goldStorage, mapController);
				jQuery('body')
					.commandLineWidget('Shift+Space Ctrl+Space', mapModel)
					.searchWidget('Meta+F Ctrl+F', mapModel);
				jQuery('#modalAttachmentEditor').attachmentEditorWidget(mapModel, isTouch);
				jQuery('#modalAutoSave').autoSaveWidget(autoSave);
				jQuery('#modalEmbedMap').embedMapWidget(mapController);
				jQuery('#linkEditWidget').linkEditWidget(mapModel);
				jQuery('#modalExtensions').extensionsWidget(extensions, mapController, alert);
				jQuery('#nodeContextMenu').contextMenuWidget(mapModel).mapToolbarWidget(mapModel);
				jQuery('.dropdown-submenu>a').click(function () { return false; });
				jQuery('[data-category]').trackingWidget(activityLog);
				jQuery('.modal')
					.on('show',  mapModel.setInputEnabled.bind(mapModel, false, false))
					.on('hide', mapModel.setInputEnabled.bind(mapModel, true, false));
				jQuery('#modalKeyActions').keyActionsWidget();
				jQuery('#topbar .updateStyle').attr('data-mm-align', 'top').colorPicker();
				jQuery('.colorPicker-palette').addClass('topbar-color-picker');
				jQuery('.updateStyle[data-mm-align!=top]').colorPicker();
				jQuery('.colorPicker-picker').parent('a,button').click(function (e) { if (e.target === this) {jQuery(this).find('.colorPicker-picker').click(); } });
				jQuery('#modalGoldLicense').goldLicenseEntryWidget(goldLicenseManager, goldApi, activityLog);
				jQuery('#modalIconEdit').iconEditorWidget(iconEditor, config.corsProxyUrl);
				jQuery('#measuresSheet').measuresSheetWidget(measuresModel);
				jQuery('[data-mm-role=measures-display-control]').measuresDisplayControlWidget(measuresModel, mapModel);
				jQuery('.modal.huge').scalableModalWidget();
				jQuery('[data-mm-role=new-from-clipboard]').newFromClipboardWidget(objectClipboard, mapController);
				MM.setImageAlertWidget(stageImageInsertController, alert);
				jQuery('#anon-alert-template').anonSaveAlertWidget(alert, mapController, s3FileSystem, browserStorage, 'anon-alert-disabled');
				jQuery('body').splitFlipWidget(splittableController, '[data-mm-role=split-flip]', mapModel, 'Alt+o');
				jQuery('#storyboard').storyboardWidget(storyboardController, storyboardModel, storyboardDimensionProvider);
				jQuery('[data-mm-role=storyboard-menu]').storyboardMenuWidget(storyboardController, storyboardModel, mapModel);

				/* needs to come after all optional content widgets to fire show events */
				jQuery('[data-mm-role=optional-content]').optionalContentWidget(mapModel, splittableController);

				jQuery('#customStyleModal').customStyleWidget(customStyleController);
        jQuery('[data-mm-role~=new-map]').newMapWidget(mapController);
			};
		config.activeContentConfiguration = {
			nonClonedAttributes: ['storyboards', 'storyboard-scenes', 'measurements-config']
		};
		jQuery.fn.colorPicker.defaults.colors = [
			'000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600',
			'808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900',
			'99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00',
			'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99',
			'FFFF99', 'CCFFFF', 'FFFFFF', 'transparent'
		];
		jQuery.fn.colorPicker.defaults.pickerDefault = 'transparent';
		MM.OfflineMapStorageBookmarks(offlineMapStorage, mapBookmarks);
		jQuery.support.cors = true;
		setupTracking(activityLog, jotForm, mapModel);
		jQuery('body').classCachingWidget('cached-classes', browserStorage);
		MM.MapController.activityTracking(mapController, activityLog);
		MM.MapController.alerts(mapController, alert, modalConfirm);
		MM.measuresModelMediator(mapModel, measuresModel);
		mapController.addEventListener('mapLoaded', function (mapId, idea) {
			idea.setConfiguration(config.activeContentConfiguration);
			mapModel.setIdea(idea);
		});
		if (browserStorage.fake) {
			alert.show('Browser storage unavailable!', 'You might be running the app in private mode or have no browser storage - some features of this application will not work fully.', 'warning');
			activityLog.log('Warning', 'Local storage not available');
		}
		jQuery('#topbar').alertWidget(alert);
		if (window.mmtimestamp) {
			window.mmtimestamp.log('mm initialized');
		}
		extensions.load(navigation.initialMapId()).then(function () {
			if (window.mmtimestamp) {
				window.mmtimestamp.log('extensions loaded');
			}
			jQuery('[data-mm-clone]').each(function () {
				var element = jQuery(this),
					toClone = jQuery(element.data('mm-clone'));
				toClone.children().clone(true).appendTo(element);
				element.attr('data-mm-role', toClone.attr('data-mm-role'));
			});
			loadWidgets();
			if (window.mmtimestamp) {
				window.mmtimestamp.log('ui loaded');
			}
			if (!navigation.loadInitial()) {
				jQuery('#logo-img').click();
			}
		});
	});

};
