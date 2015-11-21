'use strict';
$(function onLoad() {
    var updateRatingUrl = 'ws://rating.smartjs.academy/rating';
    var initUrl = 'http://rating.smartjs.academy/rating';
    var controller = {
        init: function () {
            this.messageReceiver = null;
            this.users = null;
            this.usersView = null;
            this.ws = new WebSocket(updateRatingUrl);
            this.ws.onclose = this.onSocketClose.bind(this);
            this.ws.onmessage = this.onConnecting.bind(this);
        },
        initUsers: function () {
            this.messageReceiver = new Models.Buffer(); // create tmp buffer for messages
            this.users = new Models.Users();
            this.usersView = new Views.UsersView({ model: this.users, className: 'css-slots' });
            this.users.fetch({ url: initUrl, success: this.onUsersFetched.bind(this) });
            this.ws.onmessage = this.onRatingChange.bind(this);
        },
        onConnecting : function (event) {
            var message;
            if (event) {
                message = JSON.parse(event.data);
                if (message.status != 'CONNECTED') {
                    this.init();
                } else {
                    this.initUsers();
                }
            }
        },
        onRatingChange: function (event) {
            var message;
            if (event) {
                message = JSON.parse(event.data);
                if (!this.messageReceiver.receive(message)) {
                    this.init(); // We lost packet, try to reInit app
                } else {
                    this.usersView.render();
                }
            }
        },
        onUsersFetched : function() {
            if (!this.users.receiveMessages(this.messageReceiver.asArray())) {
                this.init(); // We lost packet in tmp buffer, try to reInit app
            } else {
                this.messageReceiver = this.users;
            }
        },
        onSocketClose: function () {
            this.init();
        }
    };
    var Models = (function () {
        var models = {};
        models.Buffer = function Buffer() {
            var _buf = [];
            this.receive = function (message) {
                _buf.push(message);
                return true;
            };
            this.asArray = function () {
                return _buf;
            };
        };
        models.User = Backbone.Model.extend();
        models.Users = Backbone.Collection.extend({
            model: models.User,
            comparator: function (first, second) {
                return second.attributes.points - first.attributes.points;
            },
            parse: function (response) {
                this.version = response.version;
                return response.records;
            },
            receive: function (message) {
                if (this.version < message.fromVersion) {
                    return false; // We lost packed
                };
                if (this.version > message.fromVersion) {
                    return true; // Old packet, skip
                };
                this.set(message.updates, { remove: false, sort: false });
                this.sort();
                this.version = message.toVersion;
                return true;
            },
            receiveMessages: function (messages) {
                var message;
                while (messages.length > 0) {
                    message = messages.shift();
                    if (!this.receive(message)) {
                        return false;
                    }
                }
                return true;
            }
        });
        return models;
    })();
    var Views = (function () {
        var views = {};
        views.UsersView = Backbone.View.extend({
            initialize: function (options) {
                this.setElement($('.' + this.className));
                //this.listenTo(this.model, 'change', this.render);
            },
            template: _.template('<li class="css-slot"><h3>Name: <%= name %></h3><h6>Points: <%= points %></h6></li>'),
            render: function () {
                //console.log('Render')
                this.$el.empty();
                this.model.forEach((function (user) {
                    var newUserView = $(this.template(user.attributes));
                    newUserView.appendTo(this.$el);
                }).bind(this));
            }
        });
        return views;
    })();
    controller.init();
});
