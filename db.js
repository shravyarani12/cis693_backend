const db=require('knex')({
    client: 'mysql',
    connection: {
      host : process.env.db_host,
      port : 3306,
      user : process.env.db_username,
      password : process.env.db_password,
      database : process.env.db_name
    }
  });

  exports.db = db;