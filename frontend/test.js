const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf-8');
console.log("File read successfully, size:", content.length);
