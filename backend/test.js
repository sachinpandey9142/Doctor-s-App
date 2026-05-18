const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require("mongoose");

require('dotenv').config({
  path: __dirname + '/.env'
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });