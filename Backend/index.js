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
  return jwt.sign({ username: object.username }, adminsecretKey, {
    expiresIn: "1h",
  });
};
const usergeneratejwt = (object) => {
  return jwt.sign({ username: object.username }, usersecretKey, {
    expiresIn: "1h",
  });
};

const adminAuthentication = (req, res, next) => {
  // console.log(req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, adminsecretKey, (err, orignalData) => {
      if (err) {
        res.sendStatus(402);
      } else {
        next();
      }
    });
  } else {
    res.sendStatus(401);
  }
};

const userAuthentication = (req, res, next) => {
  console.log(req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, usersecretKey, (err, orignalData) => {
      if (err) {
        res.sendStatus(401);
      } else {
        console.log(originalData);
        const user = USER.find((u) => u.username === orignalData.username);
        req.user = user; //we can use it in next callback, in middleware we can update the req and res objects
        next();
      }
    });
  } else {
    res.sendStatus(401);
  }
};

//ADMIN ROUTES
app.post("/admin/signUp", (req, res) => {
  var existingAccount = ADMIN.find((a) => {
    if (a.username === req.body.username) {
      return a;
    }
  });
  if (existingAccount) {
    res.status(403).json({
      message: "An account with the specified username/email already exists.",
    });
  } else {
    ADMIN.push(req.body);
    const token = admingeneratejwt(req.body);
    res.json({ message: "Account is successfully created", token });
    console.log(req.body);
  }
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
    res.json({ message: "Login Successfully", token });
  } else {
    res.sendStatus(403); //Forbidden
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
  const courseInd = COURSES.findIndex((c) => c.courseId === courseId);
  console.log(courseInd);
  //  course act as refrence to object it will upadate the original object in arrray
  // we cannot directly find course in arr as admin can pass wrong id which means course not exist
  // to deal with that we find courseindex and if cid =-1 means does not exist;
  if (courseInd > -1) {
    Object.assign(COURSES[courseInd], req.body);
    console.log(COURSES[courseInd]);
    res.json({ Mssg: "Updated Successfully" });
  }
  res.status(404).send({ messg: "Course does not exist in database" });
});

app.get("/admin/courses", adminAuthentication, (req, res) => {
  res.json({ courses: COURSES });
});

// admin person can be user person but user person cannot be admin
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
