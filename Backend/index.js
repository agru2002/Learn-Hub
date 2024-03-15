const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const PORT = 3000;
require("dotenv").config();

app.use(bodyParser.json());
app.use(cors());

const ADMIN = [];
const USER = [];
const COURSES = [];

// only server knows the secret key
const adminsecretKey = process.env.ADMINSECRETKEY;
const usersecretKey = process.env.USERSECRETKEY;

const admingeneratejwt = (object) => {
  return jwt.sign({ username: object.username }, adminsecretKey);
};
const usergeneratejwt = (object) => {
  return jwt.sign({ username: object.username }, usersecretKey);
};

const adminAuthentication = (req, res, next) => {
  console.log(req.headers);
  jwt.verify(req.headers, adminsecretKey, (err, orignalData) => {
    if (err) {
      res.sendStatus(402);
    } else {
      next();
    }
  });
};

const userAuthentication = (req, res, next) => {
  console.log(req.headers);
  jwt.verify(req.headers, usersecretKey, (err, orignalData) => {
    if (err) {
      res.sendStatus(401);
    } else {
      console.log(originalData);
      const user = USER.find((u) => u.username === orignalData.username);
      req.user = user; //we can use it in next callback, in middleware we can update the req and res objects
      next();
    }
  });
};

//ADMIN ROUTES
app.post("/admin/signUp", (req, res) => {
  var existingAccount = ADMIN.find((a) => {
    if (a.username === req.headers.username) {
      return a;
    }
  });
  if (existingAccount) {
    res.status(409).json({
      message: "An account with the specified username/email already exists.",
    });
  }
  ADMIN.push(req.headers);
  const token = admingeneratejwt(req.headers);
  res.status(200).json({ message: "Account is successfully created", token });
  console.log(req.headers);
});

app.post("/admin/login", (req, res) => {
  console.log(req.headers);
  var existingAccount = ADMIN.find((a) => {
    if (
      a.username === req.headers.username &&
      a.password === req.headers.password
    ) {
      return true;
    }
  });
  if (existingAccount) {
    const token = admingeneratejwt(req.headers);
    res.status(200).json({ message: "Login Successfully", token });
  } else {
    res.sendStatus(403); //should be provide as if else cannot set header after they sent to client
  }
});

// var courseId = 0;
app.post("/admin/courses", adminAuthentication, (req, res) => {
  var courseId = COURSES.length + 1;
  var course = { ...req.body, courseId: courseId };
  COURSES.push(course);
  res.send({
    Messg: "Course created successfully ",
    courseId: courseId,
  });
});

app.put("/admin/courses/:courseId", adminAuthentication, (req, res) => {
  console.log(req.params.courseId);
  const courseId = parseInt(req.params.courseId);
  const course = COURSES.find((c) => c.courseId === courseId);
  console.log(course);
  //  course act as refrence to object it will upadate the original object in arrray
  if (course) {
    Object.assign(course, req.body);
    console.log(course);
    res.send({ Mssg: "Updated Successfully" });
  }
  res.status(404).send({ messg: "Course does not exist in database" });
});

app.get("/admin/courses", adminAuthentication, (req, res) => {
  res.json(COURSES);
});

// admin person can be uer person but user person cannot be admin
// USERS ROUTES
app.post("/users/signUp", (req, res) => {
  const user = {
    username: req.headers.username,
    password: req.headers.password,
    purchasedCourses: [],
  };
  var existingAccount = USER.find((u) => {
    if (u.username === req.headers.username) return true;
  });
  if (existingAccount) {
    res.sendStatus(403);
  }
  USER.push(user);
  const token = usergeneratejwt(user);
  res.json({ mssg: "User created successfully", token });
  console.log(user);
});

app.post("/users/login", (req, res) => {
  var existingAccount = USER.find((a) => {
    if (
      a.username === req.headers.username &&
      a.password === req.headers.password
    ) {
      return a;
    }
  });
  console.log(existingAccount);
  if (existingAccount) {
    const token = usergeneratejwt(existingAccount);
    res.json({ Mssg: "Logged in Successfully", token });
    console.log(req.headers);
  } else {
    res.sendStatus(403);
  }
});

// listing all the courses which are published
app.get("/users/courses", userAuthentication, (req, res) => {
  res.send({ Courses: COURSES.filter((obj) => obj.published == true) });
});

app.post("/users/courses/:courseId", userAuthentication, (req, res) => {
  var course = COURSES.find(
    (c) => c.courseId === parseInt(req.params.courseId) && c.published == true
  );
  if (course) {
    req.user.purchasedCourses.push(course.courseId);
    res.json({ Messg: "Course purchased successfully" });
  }
  res.sendStatus(404);
});

app.get("/users/purchasedCourses", userAuthentication, (req, res) => {
  var purchasedCoursesIds = req.user.purchasedCourses; //[1,4]
  var purchasedCourses = [];
  for (let i = 0; i < COURSES.length; i++) {
    if (purchasedCoursesIds.indexOf(COURSES[i].id) != -1) {
      purchasedCourses.push(COURSES[i]);
    }
  }
  res.json({ purchasedCourses: purchasedCourses });
});

app.listen(PORT, () => {
  console.log(" Server is listening at port " + PORT);
});
