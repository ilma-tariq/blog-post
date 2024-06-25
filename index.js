import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import pg from "pg";
import env from "dotenv";

const app= express();
const port=3000;
const saltRounds=10;
env.config();


app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

let currentUser;

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  let users = result.rows;
  // console.log(users.find((user) => user.username == currentUser));
  return users.find((user) => user.username == currentUser);
}


app.get("/", (req, res) => {
    // res.sendFile(__dirname + "/public/index.html");
    res.render("index.ejs");
  });

app.get("/create", async(req, res) => {
  const currUser= await getCurrentUser();
  const username= currentUser.username;
  console.log("current user in get req", currUser);
  res.render("create.ejs",{
    user:username,
  });
});


app.post("/create", async(req, res) => {
  const currUser= await getCurrentUser();
  const username= currUser.username;
  console.log("current user in post req", currUser);
  console.log(currUser);
  console.log(username);
  await db.query("INSERT INTO posts(post,u_id) VALUES($1,$2)",[req.body.blog,currUser.id]);
  res.render("index.ejs",{
    user:username,
  });
});

app.get("/viewc", async(req, res) => {
  const currUser= await getCurrentUser();
  const username= currUser.username;
  const content= await db.query("SELECT posts.id,posts.post FROM POSTS INNER JOIN USERS ON POSTS.u_id=USERS.id;");
  // let posts=[];
  //   content.rows.forEach((blog) => {
  //     posts.push(blog);
  //   });
    // console.log(content.rows);

    res.render("post-view.ejs",{
      user:username,
      posts:content.rows,
    });

  });
  app.post("/delete",async(req,res)=>{
    const currUser= await getCurrentUser();
    const username= currUser.username;
    console.log(req.body.deletePost); //using checkbox to delete items
    await db.query("Delete from posts where id=$1",[req.body.deletePost]);


    res.redirect("/viewc");
  })

  // login
  app.get("/register", (req, res) => {
    res.render("sign.ejs");
  });
  app.get("/log", (req, res) => {
    res.render("login.ejs");
  });
  app.post("/register",async(req,res)=>{
    // console.log(req.body);
    const email=req.body.email;
    const password=req.body.password;
    const username= req.body.username;
    console.log(email);
    console.log(password);

    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        res.send("Email already exists. Try logging in.");
      } else {
        //hashing the password and saving it in the database
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            console.log("Hashed Password:", hash);
            await db.query(
              "INSERT INTO users (username,email, password) VALUES ($1, $2,$3)",
              [username,email, hash]
            );
            res.render("login.ejs");
          }
        });
      }
    } catch (error) {
      console.log(error);
    }


});

app.post("/log", async(req,res)=>{
  const username = req.body.username;
  const loginPassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      //verifying the password
      bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
        } else {
          if (result) {
            currentUser=username;
            res.render("index.ejs",{
              user:username,
            });
          } else {
            res.send("Incorrect Password");
          }
        }
      });
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }

});


app.listen(port,()=>{
    console.log(`Port ${port} running currently!`);
})