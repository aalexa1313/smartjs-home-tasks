'use strict';
$(function onLoad() {
    var obivanLocationUrl = 'ws://jedi.smartjs.academy';
    var rootUrl = 'http://jedi.smartjs.academy/dark-jedis/';
    var darthSidiuosUrl = '3616';
    var ws;
    var controller = {
        onLordSithCollectionChange : function onLordSithCollectionChange() {
            lordSithList.update(location.attributes.name);
        },
        onObiwanLocationChanged: function onObiwanLocationChanged(event) {
            var message;
            if (event) {
                message = JSON.parse(event.data);
                location.set('name', message.name);
                location.id = message.id;
                lordSithList.update(message.name);
                //lordSithList.update('Naboo');
                console.log(message);
            }
        },
        onSocketClose: function onSocketClose() {
            console.log('Socket closed');
            ws = new WebSocket(obivanLocationUrl);
            ws.addEventListener('message', controller.onObiwanLocationChanged);
            ws.addEventListener('close', controller.onSocketClose);
        },
        onScrollUpClicked: function _onScrollUpClicked() {
            lordSithList.scrollDown(location.attributes.name);
            lordSithList.up
        },
        onScrollDownClicked: function _onScrollDownClicked() {
            lordSithList.scrollUp(location.attributes.name);
        }
    };
    var Models = (function () {
        var models = {};
        models.Location = Backbone.Model.extend();
        models.ScrollButton = Backbone.Model.extend({
            initialize: function (options) {
                this.attributes.enabled = options.enabled;
            }
        });
        models.LordSithModel = Backbone.Model.extend({
            cancelRequest: function () {
                if (this.request) {
                    this.request.abort();
                }
            }
        });
        models.LordSithList = Backbone.Collection.extend({
            model: models.LordSithModel,
            initialize: function (options) {
                this.onChange = options.listener;
                this.upButton = options.upButton;
                this.downButton = options.downButton;
                this.location = options.location;
            },
            getEmptyElement: function(){
                return new this.model();
            },
            _getUpButtonsState: function (lordsList) {
                return (lordsList.at(0).attributes.master != null) && (lordsList.at(0).attributes.master.id != null);
            },
            _getDownButtonsState: function (lordsList) {
                return (lordsList.at(lordsList.length - 1).attributes.apprentice != null) && (lordsList.at(lordsList.length - 1).attributes.apprentice.id != null);
            },
            _lock: function () {
                this.forEach(function (lord) {
                    lord.cancelRequest();
                });
                this.upButton.set('enabled', false);
                this.downButton.set('enabled', false);
            },
            _fetchMasters: function () {
                var lord, master;
                var i;
                for (var i = this.length - 1; i > 0 ; i--) {
                    lord = this.at(i);
                    if (!lord.attributes.master) {
                        break;
                    }
                    master = this.at(i - 1);
                    if (!master.attributes.name) {
                        master.request = master.fetch({ url: rootUrl + lord.attributes.master.id.toString() });
                        master.request.done((function () {
                            this.onChange();
                        }).bind(this));
                    }
                }
            },
            _fetchApprentices: function () {
                var lord, apprentice;
                var i;
                for (i = 0; i < this.length - 1; i++) {
                    lord = this.at(i);
                    if (!lord.attributes.apprentice || !lord.attributes.apprentice.id) {
                        break;
                    }
                    apprentice = this.at(i + 1);
                    if (!apprentice.attributes.name) {
                        apprentice.request = apprentice.fetch({ url: rootUrl + lord.attributes.apprentice.id.toString() })
                        apprentice.request.done((function () {
                            this.onChange();
                        }).bind(this));
                    }
                }
            },
            update: function (obiWanLocation) {
                var lord;
                var i;
                var captured = false;
                for (var i = 0; i < this.length; i++) {
                    lord = this.at(i);
                    if (lord.attributes.homeworld && lord.attributes.homeworld.name == obiWanLocation) {
                        lord.set('captured', true);
                        this._lock();
                        captured = true;
                    } else {
                        lord.set('captured', false);
                    }
                }
                if (!captured) {
                    this.upButton.set('enabled', this._getUpButtonsState(this));
                    this.downButton.set('enabled', this._getDownButtonsState(this));
                    this._fetchApprentices();
                    this._fetchMasters();
                }
            },
            scrollDown: function () {
                var lord;
                lord = this.pop();
                lord.cancelRequest();
                lord = this.pop();
                lord.cancelRequest();
                this.unshift(lordSithList.getEmptyElement());
                this.unshift(lordSithList.getEmptyElement());
                this.onChange();
            },
            scrollUp: function scrollUp() {
                var lord;
                lord = this.shift();
                lord.cancelRequest();
                lord = this.shift();
                lord.cancelRequest();
                this.push(lordSithList.getEmptyElement());
                this.push(lordSithList.getEmptyElement());
                this.onChange();
            }
        });
        return models;
    })();
    var Views = (function () {
        var views = {};
        views.LocationView = Backbone.View.extend({
            initialize: function () {
                this.setElement($('.css-planet-monitor'));
                this.listenTo(this.model, 'change', this.render);
                ws = new WebSocket(obivanLocationUrl);
                ws.addEventListener('message', controller.onObiwanLocationChanged);
                ws.addEventListener('close', controller.onSocketClose);
            },
            template: _.template('Obi-Wan currently on <%= name %>'),
            render: function () {
                this.el.innerHTML = this.template(this.model.attributes);
                return this;
            }
        });
        views.LordsListButtonView = Backbone.View.extend({
            initialize: function (options) {
                this.setElement($('.' + this.className));
                this.listener = options.listener;
                this.listenTo(this.model, 'change', this.render);
            },
            events: {
                'click': "listener"
            },
            render: function () {
                if (this.model.attributes.enabled) {
                    this.delegateEvents();
                    this.$el.removeClass('css-button-disabled');
                } else {
                    this.undelegateEvents();
                    this.$el.addClass('css-button-disabled');
                }
            }
        });
        views.LordListView = Backbone.View.extend({
            initialize: function (options) {
                this.setElement($('.' + this.className));
                this.listenTo(this.model, 'change', this.render);
            },
            template: _.template('<li class="css-slot"><h3><%= name %></h3><h6>Homeworld: <%= homeworld.name %></h6></li>'),
            render: function () {
                this.$el.empty();
                this.model.forEach((function (lord) {
                    var newLordView;
                    if (lord.attributes.name) {
                        newLordView = $(this.template(lord.attributes));
                    } else {
                        newLordView = $('<li class="css-slot"></li>');
                    }
                    if (lord.attributes.captured) {
                        newLordView.css({ color: 'red' });
                    }
                    newLordView.appendTo(this.$el);
                }).bind(this));
            }
        });
        return views;
    })();

    var location = new Models.Location();
    // -- Obi-Wan location view -------------------------------------

    var locationView = new Views.LocationView({ model: location });
// -----------------------------------------------------------------------------------
    var scrollUpButton = new Models.ScrollButton({ enabled: true });
    var scrollDownButton = new Models.ScrollButton({ enabled: true });
    // --- Buttons view -------------------------------------------
    var lordsListButtonDownView = new Views.LordsListButtonView({ model: scrollDownButton, className: 'css-button-down', listener: controller.onScrollDownClicked });
    var lordsListButtonUpView = new Views.LordsListButtonView({ model: scrollUpButton, className: 'css-button-up', listener: controller.onScrollUpClicked });

// --------------------------- Lords view ----------------------------------------------
    var lordSithList = new Models.LordSithList({ listener: controller.onLordSithCollectionChange, upButton: scrollUpButton, downButton: scrollDownButton, location: location , url: rootUrl});
    lordSithList.reset();
    //var lord = new Models.LordSithModel();
    var lord = lordSithList.getEmptyElement();
    lord.request = lord.fetch({ url: rootUrl + darthSidiuosUrl });
    lord.request.done( (function () {
        this.collection.onChange();
    }).bind(lord));
    lordSithList.push(lord);
    lordSithList.push(lordSithList.getEmptyElement());
    lordSithList.push(lordSithList.getEmptyElement());
    lordSithList.push(lordSithList.getEmptyElement());
    lordSithList.push(lordSithList.getEmptyElement());
    lordSithList.update();

    var lordListView = new Views.LordListView({ model: lordSithList, className: 'css-slots' });
    lordListView.render();
});
