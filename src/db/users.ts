import * as sq from 'sequelize';

const sqinstance = new sq.Sequelize(process.env.DATABASE_URL as string, {
  ssl: true,
  dialectOptions: {ssl: {rejectUnauthorized: false}},
});

const _User = sqinstance.define(
  'user',
  {
    id: {
      type: sq.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: sq.STRING,
    password: sq.STRING,
    name: sq.STRING,
  },
  {
    freezeTableName: true, // Model tableName will be the same as the model name
  }
);
sqinstance.sync();

const users = [
  // {id: '1', username: 'bob', password: 'secret', name: 'Bob Smith'},
  //{id: '2', username: 'joe', password: 'password', name: 'Joe Davis'},
  {id: '3', username: 'theuser', password: 'yourpwpw', name: 'test user'},
];

module.exports.findById = (id: string, done: Function) => {
  for (let i = 0, len = users.length; i < len; i++) {
    if (users[i].id === id) return done(null, users[i]);
  }
  return done(new Error('User Not Found'));
};

module.exports.findByUsername = (username: string, done: Function) => {
  for (let i = 0, len = users.length; i < len; i++) {
    if (users[i].username === username) return done(null, users[i]);
  }
  return done(new Error('User Not Found'));
};
