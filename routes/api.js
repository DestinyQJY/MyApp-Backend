const express = require('express')
const router = express.Router()
const dbConfig = require('../config/database')
const mysql = require('mysql')
const pool = mysql.createPool(dbConfig)


// 处理“获取产品信息”的请求，从数据库中获取数据并返回
router.get('/products', (req, res) => {
  const getProductsQuery = 'SELECT * FROM `ProductInformation_Table`'

  // 连接数据库
  pool.getConnection((error, connection) => {
    // 处理数据库连接池异常
    if (error) {
      res.status(500).send(error)
      return
    }

    // 数据库查询
    connection.query(getProductsQuery, (error, results) => {
      // 释放连接
      connection.release()

      // 处理异常
      if (error) {
        res.status(500).send(error)
        return
      } else {
        res.send(results)
      }
    })
  })
})


// 处理“获取产品信息”的请求，从数据库中获取数据并返回
router.get('/products/:id', (req, res) => {
  const productId = req.params.id

  // 参数化查询以避免SQL注入
  const getProductQuery = 'SELECT * FROM `ProductInformation_Table` Where `Product_ID` = ?'

  // 连接数据库
  pool.getConnection((error, connection) => {
    // 处理数据库连接池异常
    if (error) {
      res.status(500).send(error)
      return
    }

    // 数据库查询
    connection.query(getProductQuery, [productId], (error, results) => {
      // 释放连接
      connection.release()

      // 处理异常
      if (error) {
        res.status(500).send(error)
        return
      } else if (results.length == 0) {
        res.status(404).send("Product not found")
      } else {
        res.send(results)
      }
    })
  })
})


// 处理“用户登录”的请求，从数据库中获取数据并校验
router.post('/user/login', (req, res) => {
  const userId = req.query.userid
  const userPassword = req.query.password

  // 参数化查询以避免SQL注入
  const userLoginQuery = 'SELECT * FROM `UserInformation_Table` Where `User_ID` = ?'

  // 连接数据库
  pool.getConnection((error, connection) => {
    // 处理数据库连接池异常
    if (error) {
      res.status(500).send(error)
      return
    }

    // 数据库查询
    connection.query(userLoginQuery, [userId], (error, results) => {
      // 释放连接
      connection.release()

      // 处理异常
      if (error) {
        res.status(500).send(error)
      } else if (results.length === 0) {
        res.status(401).send("User not found")
      } else {
        const storedPassword = results[0].User_Password

        // 校验密码
        if (userPassword === storedPassword) {
          res.send("Login successful")
        } else {
          res.status(401).send("Invalid password")
        }
      }
    })
  })
})


// 处理“用户注册”请求，注册成功向数据库中添加数据
router.post('/user/register', (req, res) => {
  const { userId, userPassword, userName } = req.body

  // 参数化查询以避免SQL注入
  const checkUserQuery = 'SELECT `User_ID` FROM `UserInformation_Table` WHERE `User_ID` = ?'
  const userRegisterQuery = 'INSERT INTO `UserInformation_Table` (`User_ID`, `User_Password`, `User_Name`) VALUES (?, ?, ?)'

  // 连接数据库
  pool.getConnection((error, connection) => {
    // 处理数据库连接池异常
    if (error) {
      res.status(500).send(error)
      return
    }

    // 数据库查询：检查 UserID 是否已被占用
    connection.query(checkUserQuery, [userId], (error, results) => {
      // 处理异常
      if (error) {
        connection.release()
        res.status(500).send(error)
      } else if (results.length > 0) {
        // UserID 被占用

        connection.release()
        res.status(400).send("UserID is already in use")
      } else {
        // UserID 未被占用，执行注册操作

        // 数据库插入一条新记录
        connection.query(userRegisterQuery, [userId, userPassword, userName], (error) => {
          // 释放连接
          connection.release()

          // 处理异常
          if (error) {
            res.status(500).send(error)
          } else {
            res.status(201).send("User registered successfully")
          }
        })
      }
    })
  })
})


// 处理“更新购物车”请求，同时更新数据库数据
router.post('/cart', (req, res) => {
  const { userId, productId, num } = req.body

  // 参数化查询以避免SQL注入
  const checkCartQuery = 'SELECT * FROM `ShoppingCart_Table` WHERE `User_ID` = ? AND `Product_ID` = ?'
  const insertCartQuery = 'INSERT INTO `ShoppingCart_Table` (`User_ID`, `Product_ID`, `Favorite_Product_Num`) VALUES (?, ?, ?)'
  const deleteCartQuery = 'DELETE FROM `ShoppingCart_Table` WHERE `User_ID` = ? AND `Product_ID` = ?'
  const updateCartQuery = 'UPDATE `ShoppingCart_Table` SET `Favorite_Product_Num` = ? WHERE `User_ID` = ? AND `Product_ID` = ?'

  // 连接数据库
  pool.getConnection((error, connection) => {
    // 处理数据库连接池异常
    if (error) {
      res.status(500).send(error)
      return
    }

    // 数据库查询：检查 用户购物车 中，是否已拥有对应商品的记录
    connection.query(checkCartQuery, [userId, productId], (error, results) => {
      // 处理异常
      if (error) {
        connection.release()
        res.status(500).send(error)
      } else if (results.length === 0) {
        // 用户购物车中无对应商品记录
        if (num === 0) {
          // 选购商品数量为 0 ，无须进行操作

          // 释放连接
          connection.release()
          res.send("Item not found in the shopping cart")
        } else {
          // 选购商品数量为 num ，插入一条新记录

          // 数据库插入一条新记录
          connection.query(insertCartQuery, [userId, productId, num], (error) => {
            // 释放连接
            connection.release()

            // 处理异常
            if (error) {
              res.status(500).send(error)
            } else {
              res.send("Item added to the shopping cart")
            }
          })
        }
      } else {
        // 用户购物车中有对应商品记录
        if (num === 0) {
          // 选购商品数量为 0 ，删除对应的记录

          // 数据库删除一条记录
          connection.query(deleteCartQuery, [userId, productId], (error) => {
            // 释放连接
            connection.release()

            // 处理异常
            if (error) {
              res.status(500).send(error)
            } else {
              res.send("Item removed from the shopping cart")
            }
          })
        } else {
          // 选购商品数量为 num ，更新对应的记录

          // 数据库更新记录
          connection.query(updateCartQuery, [num, userId, productId], (error) => {
            // 释放连接
            connection.release()

            // 处理异常
            if (error) {
              res.status(500).send(error)
            } else {
              res.send("Shopping cart updated successfully")
            }
          })
        }
      }
    })
  })
})


module.exports = router
