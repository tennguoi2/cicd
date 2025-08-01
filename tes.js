const mysql = require('mysql2');

const config = {
  host: 'localhost',
  user: 'root',
  password: 'minh152005minh',
  database: 'login'
};

const connection = mysql.createConnection(config);

connection.connect((err) => {
  if (err) {
    console.error('Kết nối MySQL thất bại:', err);
    process.exit(1);
  } else {
    console.log('Kết nối MySQL thành công!');
    connection.end();
  }
});