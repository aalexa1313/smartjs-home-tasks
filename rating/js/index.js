'use strict';
$(function onLoad() {
    var updateRatingUrl = 'ws://rating.smartjs.academy/rating';
    var initUrl = 'http://rating.smartjs.academy/rating';
    //var ws;
    var controller = {
        init: function () {
            controller.messageReceiver = null;
            controller.users = null;
            controller.usersView = null;
            controller.ws = new WebSocket(updateRatingUrl);
            controller.ws.onclose = controller.onSocketClose;
            controller.ws.onmessage = controller.onConnecting;
        },
        initUsers: function () {
            controller.messageReceiver = new Models.Buffer();
            controller.users = new Models.Users();
            controller.usersView = new Views.UsersView({ model: controller.users, className: 'css-slots' });
            controller.users.fetch({ url: initUrl, success: controller.onUsersFetched });
            controller.ws.onmessage = controller.onRatingChange;
        },
        onConnecting : function (event) {
            var message;
            if (event) {
                message = JSON.parse(event.data);
                if (message.status != 'CONNECTED') {
                    controller.init();
                } else {
                    controller.initUsers();
                }
            }
        },
        onRatingChange: function (event) {
            var message;
            if (event) {
                message = JSON.parse(event.data);
                if (!controller.messageReceiver.receive(message)) {
                    controller.init();
                } else {
                    controller.usersView.render();
                }
            }
        },
        onUsersFetched : function() {
            if (!controller.users.receiveMessages(controller.messageReceiver.asArray())) {
                controller.init();
            } else {
                controller.messageReceiver = controller.users;
            }
        },
        onSocketClose: function () {
            controller.init();
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
                if (this.version != message.fromVersion) {
                    return false;
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
