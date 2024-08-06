// Compare object titles alphabetically (case insensitive)
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

module.exports = {
  // return the list of todo lists sorted by completion status and title.
  sortTodoLists(undone, done) {
    undone.sort(compareByTitle);
    done.sort(compareByTitle);
    return [].concat(undone, done);
  },

  // return the list of todos in the todo list sorted by completion status and
  // title.
  sortTodos(todoList) {
    let undone = todoList.filter((todo) => !todo.isDoneTodo());
    let done = todoList.filter((todo) => todo.isDoneTodo());
    undone.sort(compareByTitle);
    done.sort(compareByTitle);
    return [].concat(undone, done);
  },
};
