const SeedData = require("./seed-data");
const deepCopy = require("./deep-copy");

const { sortTodoLists, sortTodos } = require("./sort");
const nextId = require("./next-id");

const compareByTitle = (itemA, itemB) => {
  let titleA = itemA.title.toLowerCase();
  let titleB = itemB.title.toLowerCase();

  if (titleA < titleB) {
    return -1;
  } else if (titleA > titleB) {
    return 1;
  } else {
    return 0;
  }
};

module.exports = class SessionPersistence {
  constructor(session) {
    this._todoLists = session.todoLists || deepCopy(SeedData);
    session.todoLists = this._todoLists;
  }

  sortedTodoLists() {
    let todoLists = deepCopy(this._todoLists);
    let undone = todoLists.filter((todoList) => !this.isDoneTodoList(todoList));
    let done = todoLists.filter((todoList) => this.isDoneTodoList(todoList));
    return sortTodoLists(undone, done);
  }

  isDoneTodoList(todoList) {
    return (
      todoList.todos.length > 0 && todoList.todos.every((todo) => todo.done)
    );
  }

  loadTodoList(todoListId) {
    return deepCopy(this._loadStoredTodoList(todoListId));
  }

  sortedTodos(todoList) {
    let todos = todoList.todos;

    let done = todos.filter((todo) => todo.done).sort(compareByTitle);
    let undone = todos.filter((todo) => !todo.done).sort(compareByTitle);

    return deepCopy(undone.concat(done));
  }

  // Returns a copy of the indicated todo in the indicated todo list. Returns
  // `undefined` if either the todo list or the todo is not found. Note that
  // both IDs must be numeric.
  loadTodo = (todoListId, todoId) => {
    return deepCopy(this._loadStoredTodo(todoListId, todoId));
  };

  _loadStoredTodo(todoListId, todoId) {
    let todoList = this._loadStoredTodoList(todoListId);
    if (!todoList) return undefined;

    return todoList.todos.find((todo) => todo.id === todoId);
  }

  _loadStoredTodoList(todoListId) {
    let todoList = this._todoLists.find(
      (todoList) => todoList.id === todoListId
    );
    return todoList;
  }

  markDone(todoListId, todoId) {
    let todo = this._loadStoredTodo(todoListId, todoId);
    todo.done = true;
  }

  markUndone(todoListId, todoId) {
    let todo = this._loadStoredTodo(todoListId, todoId);
    todo.done = false;
  }

  removeAt(index, todoList) {
    this._validateIndex(index, todoList);
    todoList = this._loadStoredTodoList(todoList.id);
    return todoList.todos.splice(index, 1);
  }

  findIndexOf(todoToFind, todoList) {
    let findId = todoToFind.id;
    return todoList.todos.findIndex((todo) => todo.id === findId);
  }

  markAllDone(todoListId) {
    let list = this._loadStoredTodoList(todoListId);
    if (!list) return false;
    list.todos.forEach((todo) => this.markDone(todoListId, todo.id));
    return true;
  }

  createTodo(todoListId, title) {
    let todoList = this._loadStoredTodoList(todoListId);
    todoList.todos[todoList.todos.length] = {
      id: nextId(),
      title,
      done: false,
    };
    return true;
  }

  setListTitle(todoListId, newTitle) {
    let todoList = this._loadStoredTodoList(todoListId);
    todoList.title = newTitle;
    return true;
  }

  uniqueListTitle(newTitle) {
    return !this._todoLists.some((list) => list.title === newTitle);
  }

  addList(listObject) {
    this._todoLists.push(listObject);
  }

  _validateIndex(index, todoList) {
    if (!(index in todoList.todos)) {
      throw new ReferenceError(`invalid index: ${index}`);
    }
  }
};
