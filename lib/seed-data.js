const nextId = require("./next-id");

module.exports = [
  {
    id: nextId(),
    title: "Work Todos",
    todos: [
      {
        id: nextId(),
        title: "Get coffee",
        done: true,
      },
      {
        id: nextId(),
        title: "Chat with co-workers",
        done: true,
      },
      {
        id: nextId(),
        title: "Duck out of meeting",
        done: false,
      },
    ],
  },
  {
    id: nextId(),
    title: "Home Todos",
    todos: [
      {
        id: nextId(),
        title: "Feed the cats",
        done: true,
      },
      {
        id: nextId(),
        title: "Go to bed",
        done: true,
      },
      {
        id: nextId(),
        title: "Buy milk",
        done: true,
      },
      {
        id: nextId(),
        title: "Study for Launch School",
        done: true,
      },
    ],
  },
  {
    id: nextId(),
    title: "Additional Todos",
    todos: [],
  },
  {
    id: nextId(),
    title: "social todos",
    todos: [
      {
        id: nextId(),
        title: "Go to Libby's birthday party",
        done: false,
      },
    ],
  },
];
