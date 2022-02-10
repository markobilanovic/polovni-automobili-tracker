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

const tableNameAutomobili = "polovni_automobili";
const tableNameZida4 = "zida4";

async function addNewTask(title, email, url) {
    try {
      const client = await pool.connect();
      await client.query(`insert into ${tableNameAutomobili} (title, email, url, ids) values ('${title}', '${email}', '${url}', '{}')`);
      client.release();
    } catch (err) {
      console.error(err);
    } 
  }
  
  async function getAutomobili() {
    try {
      const client = await pool.connect();
      const result = await client.query(`SELECT * FROM ${tableNameAutomobili}`);
      const results = result ? result.rows : null;
      client.release();
      return results;
    } catch (err) {
      console.error(err);
    }
  }
  
  async function updateAutomobil(title, email, newIds) {
    try {
      const client = await pool.connect();
      const query = `UPDATE ${tableNameAutomobili} SET ids = ids || '{${newIds.join(",")}}' WHERE title = '${title}' AND email='${email}'`;
      await client.query(query);
      client.release();
    } catch (err) {
      console.error(err);
    } 
  }

  async function getZida4() {
    try {
      const client = await pool.connect();
      const result = await client.query(`SELECT * FROM zida4`);
      const results = result ? result.rows : null;
      client.release();
      return results;
    } catch (err) {
      console.error(err);
    }
  }

  async function updateZida4(title, email, newIds) {
    try {
      const client = await pool.connect();
      const query = `UPDATE zida4 SET ids = ids || '{${newIds.join(",")}}' WHERE title = '4 Zida'`;
      await client.query(query);
      client.release();
    } catch (err) {
      console.error(err);
    } 
  }

  async function clearProcessedAutomobili() {
    try {
        const client = await pool.connect();
        const query = `UPDATE ${tableNameAutomobili} SET ids = '{}'`;
        await client.query(query);
        client.release();
        console.log("Processed IDs - cleared");
      } catch (err) {
        console.error(err);
      } 
  }

  async function executeQuery(query) {
    try {
        const client = await pool.connect();
        await client.query(query);
        client.release();
      } catch (err) {
        console.error(err);
      } 
  }

module.exports = {
    addNewTask: addNewTask,
    updateAutomobil: updateAutomobil,
    getAutomobili: getAutomobili,
    clearProcessedAutomobili: clearProcessedAutomobili,

    getZida4: getZida4,
    updateZida4: updateZida4,

    executeQuery: executeQuery,
}