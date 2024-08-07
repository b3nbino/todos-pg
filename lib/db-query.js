const { Client } = require("pg");

function logQuery(statement, parameters) {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
}

module.exports = async function dbQuery(statement, ...parameters) {
  let client = new Client({ database: "todo-lists", password: "y6xRp2vAWI2m" });

  await client.connect();
  logQuery(statement, parameters);
  let result = await client.query(statement, parameters);
  await client.end();

  return result;
};
