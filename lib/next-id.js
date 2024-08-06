let currentId = 0;

let nextId = () => {
  currentId += 1;
  return currentId;
};

module.exports = nextId;
