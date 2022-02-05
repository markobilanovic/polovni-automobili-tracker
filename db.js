const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});



// addNewTask('Kia Ceed',
//                  'bilanovic90@gmail.com',
//                  'https://www.polovniautomobili.com/auto-oglasi/pretraga?brand=kia&model%5B%5D=ceed&brand2=&price_from=&price_to=&year_from=2014&year_to=&chassis%5B%5D=2631&flywheel=&atest=&door_num=&submit_1=&without_price=1&date_limit=&showOldNew=all&modeltxt=&engine_volume_from=&engine_volume_to=&power_from=&power_to=&mileage_from=&mileage_to=&emission_class=&seat_num=&wheel_side=&registration=&country=&country_origin=&city=&registration_price=&page=5&sort=tagValue131_asc'
//                  );

// create table
// await client.query('CREATE TABLE tasks(title text, email text, url text, processedIds integer[])');

//DELETE FROM table_name WHERE condition;

async function addNewTask(title, email, url) {
    try {
      const client = await pool.connect();
      await client.query(`insert into tasks (title, email, url, processedIds) values ('${title}', '${email}', '${url}', '{}')`);
      client.release();
    } catch (err) {
      console.error(err);
    } 
  }
  
  async function getTasks() {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM tasks');
      const results = result ? result.rows : null;
      client.release();
      return results;
    } catch (err) {
      console.error(err);
    }
  }
  
  async function updateTask(title, email, newIds) {
    try {
      const client = await pool.connect();
      const query = `UPDATE tasks SET processedIds = processedIds || '{${newIds.join(",")}}' WHERE title = '${title}' AND email='${email}'`;
      await client.query(query);
      client.release();
    } catch (err) {
      console.error(err);
    } 
  }

  async function clearProcessedIds() {
    try {
        const client = await pool.connect();
        const query = `UPDATE tasks SET processedIds = '{}'`;
        await client.query(query);
        client.release();
      } catch (err) {
        console.error(err);
      } 
  }

//   clearProcessedIds();
  
module.exports = {
    addNewTask: addNewTask,
    updateTask: updateTask,
    getTasks: getTasks,
}