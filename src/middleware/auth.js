// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err)
        return res.status(401).send({ auth: false, message: "Unauthorized" });
      else {
        const user = await User.findById(decoded.userId);
        if (!user) {
          throw new Error();
        }
        
        req.token = token;
        req.user = user;
        next();
      }
    });
    
  } catch (error) {
    console.log(error)
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;