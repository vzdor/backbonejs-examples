
var items;

$(document).ready(function ()
{
  var appView;
  var itemView;
  var formView;
  var itemRouter;

  _.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };

  var Item = Backbone.Model.extend({
    defaults: {
      title: '',
      content: ''
    },

    validate: function(attrs, options) {
      if (!attrs.title.length)
        return "title can't be blank";
    }
  });

  var ItemCollection = Backbone.Collection.extend({
    model: Item,

    localStorage: new Backbone.LocalStorage('items'),

    addNew: function(item) {
      item.set("position", this.size());
      return this.create(item, {wait: true});
    },

    comparator: function(model) {
      return model.get('position');
    },
  });

  var ListItemView = Backbone.View.extend({
    tagName: 'li',

    template: _.template('<a href="#items/{{id}}">{{title}} ' +
                         '<span class="position">({{position}})</span></a>'),

    events: {
      'click a': 'setActive',
      'drop': 'drop'
    },

    drop: function(e, index) {
      this.$el.trigger('order-change', [this.model, index]);
    },

    initialize: function() {
      this.listenTo(this.model, 'change:title', this.render);
      this.listenTo(this.model, 'change:position', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.attributes));
      return this;
    },

    setActive: function(e) {
      this.$el.siblings().removeClass('active');
      this.$el.addClass('active');
    }
  });

  var ListView = Backbone.View.extend({
    el: '#items-nav',

    events: {
      'order-change': 'sortCollection'
    },

    initialize: function() {
      this.listenTo(this.model, 'add', this.appendItem)
      this.$el.sortable({
        stop: function(event, ui) {
          ui.item.trigger('drop', ui.item.index());
        }
      });
    },

    sortCollection: function(e, item, index) {
      this.model.each(function(i) {
        if (i !== item) {
          var pos = i.get('position');
          if (pos >= index && pos < item.get('position'))
            pos += 1;
          else if (pos <= index && pos > item.get('position'))
            pos -= 1;
          i.set('position', pos);
          i.save();
        }
      }, this);
      item.set('position', index);
      item.save();
    },

    appendItem: function(item) {
      var view = new ListItemView({model: item});
      this.$el.append(view.render().el);
    },

    render: function() {
      this.$el.popover({content: 'It is sortable.', trigger: 'hover', placement: 'bottom'});
      this.model.each(this.appendItem, this);
      return this;
    }
  });

  var ItemView = Backbone.View.extend({
    template: _.template($('#item-view-template').html()),

    // events: {
    //   'click .confirm': function(e) {
    //     return confirm("Are you sure?");
    //   }
    // },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },

    render: function() {
      this.$el.html(this.template(this.model.attributes));
      return this;
    }
  });

  var FormView = Backbone.View.extend({
    template: _.template($('#item-form-template').html()),

    events: {
      'submit form': 'submit'
    },

    submit: function(e) {
      this.model.set(this.formAttributes());
      if (this.model.isValid()) {
        if (this.model.isNew())
          this.collection.addNew(this.model)
        else
          this.model.save();
        itemRouter.navigate('items/' + this.model.id, true);
      } else {
        var errs = $("#item-form-errors");
        errs.html(this.model.validationError);
        errs.removeClass("hidden");
      }
      return false;
    },

    formAttributes: function() {
      return {title: $("#item-form-title").val(),
              content: $("#item-form-content").val()};
    },

    render: function() {
      this.$el.html(this.template(this.model.attributes));
      return this;
    }
  });

  var ItemRouter = Backbone.Router.extend({
    routes: {
      "items/new": "new",
      "items/:id": "show",
      "items/:id/edit": "edit",
      "items/:id/destroy": "destroy",
      "*other": "defaultRoute"
    },

    show: function(id) {
      var item = items.get(id);
      if (item) {
        if (itemView) itemView.remove();
        itemView = new ItemView({model: item})
        appView.workspace.html(itemView.render().el)
      }
    },

    new: function() {
      if (formView) formView.remove();
      formView = new FormView({model: new Item, collection: items});
      appView.workspace.html(formView.render().el);
    },

    edit: function(id) {
      var item = items.get(id);
      if (formView) formView.remove();
      if (item) {
        formView = new FormView({model: item});
        appView.workspace.html(formView.render().el);
      }
    },

    destroy: function(id) {
      var item = items.get(id)
      if (item) item.destroy();
      this.defaultRoute();
    },

    defaultRoute: function(other) {
      if (items.isEmpty())
        this.navigate('items/new', true);
      else
        this.navigate('items/' + items.first().id, true);
    }
  });

  var AppView = Backbone.View.extend({
    el: 'body',

    workspace: $('#workspace'),

    initialize: function() {
      this.listenTo(items, 'add', this.render);
      this.listenTo(items, 'remove', this.render);
    },

    render: function() {
      this.$("#items-count").text(items.size());
      return this;
    }
  });

  items = new ItemCollection();
  items.fetch();
  if (items.isEmpty())
    _.each(data, function(item) {
      items.create(item);
    });
  listView = new ListView({model: items});
  appView = new AppView();
  appView.render();
  listView.render();


  itemRouter = new ItemRouter();

  Backbone.history.start();

  $(document).delegate('.confirm', "click", function(e) {
    return confirm("Are you sure?");
  });
});

