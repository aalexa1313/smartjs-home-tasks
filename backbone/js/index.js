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
        },
        onScrollDownClicked: function _onScrollDownClicked() {
            lordSithList.scrollUp(location.attributes.name);
        }
    };
    var Location = Backbone.Model.extend();
    var location = new Location;
    // -- Obi-Wan location view -------------------------------------
    var LocationView = Backbone.View.extend({
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

    var locationView = new LocationView({ model: location });
// -----------------------------------------------------------------------------------
    var ScrollButton = Backbone.Model.extend({
        initialize: function (options) {
            this.attributes.enabled = options.enabled;
        }
    });
    var scrollUpButton = new ScrollButton({enabled: true});
    var scrollDownButton = new ScrollButton({ enabled: true });
    // --- Buttons view -------------------------------------------
    var LordsListButtonView = Backbone.View.extend({
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
    var lordsListButtonDownView = new LordsListButtonView({ model: scrollDownButton, className: 'css-button-down', listener: controller.onScrollDownClicked });
    var lordsListButtonUpView = new LordsListButtonView({ model: scrollUpButton, className: 'css-button-up', listener: controller.onScrollUpClicked });
// --------------------------- Lords view ----------------------------------------------
    var LordSithModel = Backbone.Model.extend({
        cancelRequest: function() {
            if (this.request) {
                this.request.abort();
            }
        }
    });
  var LordSithList = Backbone.Collection.extend({
      model: LordSithModel,
      initialize: function(options) {
          this.listener = options.listener;
          this.upButton = options.upButton;
          this.downButton = options.downButton;
          this.location = options.location;
      },
      _getUpButtonsState: function(lordsList) {
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
          this.downButton.set('enabled',false);
      },
      _fetchMasters: function() {
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
                      this.listener();
                  }).bind(this));
              }
          }
      },
      _fetchApprentices: function() {
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
                      this.listener();
                  }).bind(this));
              }
          }
      },
      update: function(obiWanLocation) {
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
          if (captured) {
              return;
          }
          this.upButton.set('enabled', this._getUpButtonsState(this));
          this.downButton.set('enabled', this._getDownButtonsState(this));
          this._fetchApprentices();
          this._fetchMasters();
      },
      scrollDown: function (obiwanLocation) {
          var lord;
          lord = this.pop();
          lord.cancelRequest();
          lord = this.pop();
          lord.cancelRequest();
          this.unshift(new LordSithModel);
          this.unshift(new LordSithModel);
          this.update(obiwanLocation);
      },
      scrollUp: function scrollUp(obiwanLocation) {
          var lord;
          lord = this.shift();
          lord.cancelRequest();
          lord = this.shift();
          lord.cancelRequest();
          this.push(new LordSithModel);
          this.push(new LordSithModel);
          this.update(obiwanLocation);
      }
  });
  var lordSithList = new LordSithList({ listener: controller.onLordSithCollectionChange, upButton: scrollUpButton, downButton: scrollDownButton, location: location , url: rootUrl});
  lordSithList.reset();
  var lord = new LordSithModel();
  lordSithList.push(lord);
  lord.request = lord.fetch({ url: rootUrl + darthSidiuosUrl });
  lord.request.done( (function () {
      this.collection.listener();
  }).bind(lord));
  lordSithList.push(new LordSithModel);
  lordSithList.push(new LordSithModel);
  lordSithList.push(new LordSithModel);
  lordSithList.push(new LordSithModel);
  lordSithList.update();

  var LordListView = Backbone.View.extend({
      initialize: function(options) {
          this.setElement($('.' + this.className));
          this.listener = options.listener;
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
              //this.el.innerHTML = this.el.innerHTML + template(lord.attributes);
          }).bind(this));
      }
  });
  var lordListView = new LordListView({ model: lordSithList, className: 'css-slots', listener: controller.onLordSithCollectionChange });
  lordListView.render();
});
