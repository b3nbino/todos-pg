const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const store = require("connect-loki");
const PgPersistence = require("./lib/pg-persistence");
const catchError = require("./lib/catch-error");
const config = require("./lib/config");

const app = express();
const host = config.HOST;
const port = config.PORT;
const LokiStore = store(session);

//Middlewear before all routing check for signedIn status
const requiresAuthentication = (req, res, next) => {
  if (!res.locals.signedIn) {
    res.redirect(302, "/users/signin");
  } else {
    next();
  }
};

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    cookie: {
      httpOnly: true,
      maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
      path: "/",
      secure: false,
    },
    name: "launch-school-todos-session-id",
    resave: false,
    saveUninitialized: true,
    secret: config.SECRET,
    store: new LokiStore({}),
  })
);

app.use(flash());

//New datastore using session persistence
app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Redirect start page
app.get("/", (req, res) => {
  res.redirect("/lists");
});

// Render the list of todo lists
app.get(
  "/lists",
  requiresAuthentication,
  catchError(async (req, res) => {
    let store = res.locals.store;
    let todoLists = await store.sortedTodoLists();

    let todosInfo = todoLists.map((todoList) => ({
      countAllTodos: todoList.todos.length,
      countDoneTodos: todoList.todos.filter((todo) => todo.done).length,
      isDone: store.isDoneTodoList(todoList),
    }));

    res.render("lists", {
      todoLists,
      todosInfo,
    });
  })
);

// Render new todo list page
app.get("/lists/new", requiresAuthentication, (req, res) => {
  res.render("new-list");
});

// Create a new todo list
app.post(
  "/lists",
  requiresAuthentication,
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required.")
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters."),
  ],
  catchError(async (req, res) => {
    let listTitle = req.body.todoListTitle;
    let errors = validationResult(req);
    if (!(await res.locals.store.uniqueListTitle(listTitle))) {
      errors.errors.push({
        value: "",
        msg: "Please enter a unique title.",
        param: "todoListTitle",
        location: "body",
      });
    }
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("error", message.msg));
      res.render("new-list", {
        flash: req.flash(),
        todoListTitle: listTitle,
      });
    } else {
      let added = await res.locals.store.addList(listTitle);
      if (!added) throw new Error("Not found.");
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }
  })
);

// Render individual todo list and its todos
app.get(
  "/lists/:todoListId",
  requiresAuthentication,
  catchError(async (req, res, next) => {
    let todoListId = req.params.todoListId;
    let todoList = await res.locals.store.loadTodoList(+todoListId);
    todoList.todos = await res.locals.store.sortedTodos(todoList);

    if (todoList === undefined) {
      next(new Error("Not found."));
    } else {
      res.render("list", {
        todoList,
        isDoneList: res.locals.store.isDoneTodoList(todoList),
      });
    }
  })
);

// Toggle completion status of a todo
app.post(
  "/lists/:todoListId/todos/:todoId/toggle",
  requiresAuthentication,
  catchError(async (req, res) => {
    let { todoListId, todoId } = req.params;
    let toggled = await res.locals.store.toggleDoneTodo(+todoListId, +todoId);
    if (!toggled) throw new Error("Not found.");

    let todo = await res.locals.store.loadTodo(+todoListId, +todoId);
    if (todo.done) {
      req.flash("success", `"${todo.title}" marked done.`);
    } else {
      req.flash("success", `"${todo.title}" marked as NOT done!`);
    }

    res.redirect(`/lists/${todoListId}`);
  })
);

// Delete a todo
app.post(
  "/lists/:todoListId/todos/:todoId/destroy",
  requiresAuthentication,
  catchError(async (req, res) => {
    let { todoListId, todoId } = { ...req.params };
    let deleted = await res.locals.store.deleteTodo(todoListId, todoId);

    if (!deleted) throw new Error("Not found.");

    req.flash("success", "The todo has been deleted.");
    res.redirect(`/lists/${todoListId}`);
  })
);

// Mark all todos as done
app.post(
  "/lists/:todoListId/complete_all",
  requiresAuthentication,
  catchError(async (req, res) => {
    let todoListId = req.params.todoListId;
    let marked = await res.locals.store.markAllDone(todoListId);

    if (!marked) throw new Error("Not found.");

    req.flash("success", "All todos have been marked as done.");
    res.redirect(`/lists/${todoListId}`);
  })
);

// Create a new todo and add it to the specified list
app.post(
  "/lists/:todoListId/todos",
  requiresAuthentication,
  [
    body("todoTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The todo title is required.")
      .isLength({ max: 100 })
      .withMessage("Todo title must be between 1 and 100 characters."),
  ],
  catchError(async (req, res) => {
    let todoListId = req.params.todoListId;
    let todoList = await res.locals.store.loadTodoList(+todoListId);
    if (!todoList) throw new Error("Not found.");
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("error", message.msg));

      res.render("list", {
        flash: req.flash(),
        todoList,
        isDoneList: res.locals.store.isDoneTodoList(todoList),
      });
    } else {
      await res.locals.store.createTodo(+todoListId, req.body.todoTitle);
      req.flash("success", "The todo has been created.");
      res.redirect(`/lists/${todoListId}`);
    }
  })
);

// Render edit todo list form
app.get(
  "/lists/:todoListId/edit",
  requiresAuthentication,
  catchError(async (req, res, next) => {
    let todoListId = req.params.todoListId;
    let todoList = await res.locals.store.loadTodoList(+todoListId);
    if (!todoList) throw new Error("Not found.");

    res.render("edit-list", { todoList });
  })
);

// Delete todo list
app.post(
  "/lists/:todoListId/destroy",
  requiresAuthentication,
  catchError(async (req, res) => {
    let todoListId = +req.params.todoListId;
    let deleted = await res.locals.store.deleteTodoList(todoListId);
    if (!deleted) throw new Error("Not found.");

    req.flash("success", "Todo list deleted.");
    res.redirect("/lists");
  })
);

// Edit todo list title
app.post(
  "/lists/:todoListId/edit",
  requiresAuthentication,
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required.")
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters."),
  ],
  catchError(async (req, res) => {
    let todoListId = req.params.todoListId;
    let todoList = await res.locals.store.loadTodoList(+todoListId);
    let newTitle = req.body.todoListTitle;
    if (!todoList) throw new Error("Not found.");

    let errors = validationResult(req);
    if (!(await res.locals.store.uniqueListTitle(newTitle))) {
      errors.errors.push({
        value: "",
        msg: "Please enter a unique title.",
        param: "todoListTitle",
        location: "body",
      });
    }
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("error", message.msg));

      res.render("edit-list", {
        flash: req.flash(),
        todoListTitle: newTitle,
        todoList: todoList,
      });
    } else {
      let updated = await res.locals.store.setListTitle(+todoListId, newTitle);
      if (!updated) throw new Error("Not found.");
      req.flash("success", "Todo list updated.");
      res.redirect(`/lists/${todoListId}`);
    }
  })
);

//Sign-in initial render
app.get(
  "/users/signin",
  catchError((req, res) => {
    req.flash("info", "Please sign in.");
    res.render("signin", { flash: req.flash() });
  })
);

//Sign-in submition
app.post(
  "/users/signin",
  catchError(async (req, res) => {
    let { username, password } = req.body;
    username = username.trim();
    let authenticated = await res.locals.store.existingUser(username, password);

    if (authenticated) {
      req.session.username = username;
      req.session.signedIn = true;
      req.flash("info", "Welcome!");
      res.redirect("/lists");
    } else {
      req.flash("error", "Invalid Credentials.");
      res.render("signin", { flash: req.flash(), username });
    }
  })
);

//Sign-out
app.post(
  "/users/signout",
  catchError((req, res) => {
    delete req.session.username;
    delete req.session.signedIn;
    res.redirect("/users/signin");
  })
);

// Error handler
app.use((err, req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});
