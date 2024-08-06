const dbQuery = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }
  // Returns a promise that resolves to a sorted list of all the todo lists
  // together with their todos. The list is sorted by completion status and
  // title (case-insensitive). The todos in the list are unsorted.
  async sortedTodoLists() {
    const ALL_TODOLISTS =
      "SELECT * FROM todolists WHERE username = $1 ORDER BY lower(title) ASC";
    const FIND_TODOS = "SELECT * FROM todos WHERE username = $1";

    let resultTodoLists = dbQuery(ALL_TODOLISTS, this.username);
    let resultTodos = dbQuery(FIND_TODOS, this.username);
    let resultBoth = await Promise.all([resultTodoLists, resultTodos]);

    let allTodoLists = resultBoth.rows[0];
    let allTodos = resultBoth.rows[1];

    if (!allTodoLists || !allTodos) return undefined;

    allTodoLists.forEach((todoList) => {
      todoList.todos = allTodos.filter((todo) => {
        return todoList.id === todo.todolist_id;
      });
    });

    return this._partitionTodoLists(allTodoLists);
  }

  _partitionTodoLists(todoLists) {
    let undone = [];
    let done = [];

    todoLists.forEach((todoList) => {
      if (this.isDoneTodoList(todoList)) {
        done.push(todoList);
      } else {
        undone.push(todoList);
      }
    });

    return undone.concat(done);
  }

  isDoneTodoList(todoList) {
    return (
      todoList.todos.length > 0 && todoList.todos.every((todo) => todo.done)
    );
  }

  async loadTodoList(todoListId) {
    let todoList = dbQuery(
      "SELECT * FROM todolists WHERE id = $1 AND username = $2",
      todoListId,
      this.username
    );
    let todos = dbQuery(
      "SELECT * FROM todos WHERE todolist_id = $1 AND username = $2",
      todoListId,
      this.username
    );

    let bothLists = await Promise.all([todoList, todos]);

    todoList = bothLists[0].rows[0];
    todoList.todos = bothLists[1].rows;

    return todoList;
  }

  async sortedTodos(todoList) {
    let todoListFromDb = await dbQuery(
      "SELECT * FROM todos WHERE todolist_id = $1 AND username = $2 ORDER BY done ASC, lower(title) ASC",
      todoList.id,
      this.username
    );
    return todoListFromDb.rows;
  }

  async toggleDoneTodo(todoListId, todoId) {
    const TOGGLE_DONE =
      "UPDATE todos SET done = NOT done" +
      "  WHERE todolist_id = $1 AND id = $2 AND username = $3";

    let result = await dbQuery(TOGGLE_DONE, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async loadTodo(todoListId, todoId) {
    let queryResult = await dbQuery(
      "SELECT * FROM todos WHERE id = $1 AND todolist_id = $2 AND username = $3",
      todoId,
      todoListId,
      this.username
    );
    return queryResult.rows[0];
  }

  async deleteTodo(todoListId, todoId) {
    let queryResult = await dbQuery(
      "DELETE FROM todos WHERE todolist_id = $1 AND id = $2 AND username = $3",
      todoListId,
      todoId,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async markAllDone(todoListId) {
    let queryResult = await dbQuery(
      "UPDATE todos SET done = 'true' WHERE todolist_id = $1 AND username = $2 AND NOT done",
      todoListId,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async createTodo(todoListId, title) {
    let queryResult = await dbQuery(
      "INSERT INTO todos (title, todolist_id, username) VALUES ($1, $2, $3)",
      title,
      todoListId,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async deleteTodoList(todoListId) {
    let queryResult = await dbQuery(
      "DELETE FROM todolists WHERE id = $1 AND username = $2",
      todoListId,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async uniqueListTitle(newTitle) {
    let queryResult = await dbQuery(
      "SELECT * FROM todolists WHERE title = $1 AND username = $2",
      newTitle,
      this.username
    );
    return !(queryResult.rowCount > 0);
  }

  async setListTitle(todoListId, newTitle) {
    let queryResult = await dbQuery(
      "UPDATE todolists SET title = $1 WHERE id = $2 AND username = $3",
      newTitle,
      todoListId,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async addList(listTitle) {
    let queryResult = await dbQuery(
      "INSERT INTO todolists (title, username) VALUES ($1, $2)",
      listTitle,
      this.username
    );
    return queryResult.rowCount > 0;
  }

  async existingUser(username, password) {
    let queryResult = await dbQuery(
      "SELECT * FROM users WHERE username = $1",
      username
    );

    if (queryResult.rowCount === 0) return false;

    return bcrypt.compare(password, queryResult.rows[0].password);
  }
};
