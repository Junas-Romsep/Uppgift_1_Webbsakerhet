const express = require("express");
const bodyParser = require('body-parser');
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
const uuid = require("uuid");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const app = express();

const dbConfig = new Config("myDataBase", true, false, '/')

const db = new JsonDB(dbConfig);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/api", (req,res) => {
  res.json({ message: "Welcome to the two factor authentication exmaple" })
});

const port = 9000;
app.listen(port, () => {
  console.log(`App is running on PORT: ${port}.`);
});

app.post("/api/register",(req, res) =>{

    const id = uuid.v4();
    try {
      const path = `/user/${id}`;
    
      const temp_secret = speakeasy.generateSecret();
  
      db.push(path, { id, temp_secret });

      res.json({ id, secret: temp_secret.base32 })
    } catch(e) {
      console.log(e);
      res.status(500).json({ message: 'Error generating secret key'})
    }
});

app.post("/api/verify", (req,res) => {
    const { userId, token } = req.body;
    try {
      // Retrieve user from database
      const path = `/user/${userId}`;
      const user = db.getData(path);
      console.log({ user })
      const { base32: secret } = user.temp_secret;
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token
      });
      if (verified) {
        db.push(path, { id: userId, secret: user.temp_secret });
        res.json({ verified: true })
      } else {
        res.json({ verified: false})
      }
    } catch(error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving user'})
    };
  })

  app.post("/api/validate", (req,res) => {
    const { userId, token } = req.body;
    try {
      const path = `/user/${userId}`;
      const user = db.getData(path);
      console.log({ user })
      const { base32: secret } = user.secret;
      const tokenValidates = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
      });
      if (tokenValidates) {
        res.json({ validated: true })
      } else {
        res.json({ validated: false})
      }
    } catch(error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving user'})
    };

    app.post("/api/verify/qrcode", (req, res) => {
      const temp_secret = speakeasy.generateSecret();
      const otpauthUrl = temp_secret.otpauth_url;
    
      QRCode.toFileStream(res, otpauthUrl, function (err, url) {
        res.send(url);
      });
    });
  })