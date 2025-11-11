✅ Base URL
----------

`http://localhost:5000/api`

✅ Required Header for all secured routes
----------------------------------------

`{
  Authorization: "Bearer <JWT_TOKEN>"
}`

* * * * *

🔐 AUTH ROUTES
==============

**1\. Register User**
---------------------

```bash
axios.post("/auth/register", {
  email: "user@example.com",
  password: "password123",
  name: "John Doe",
  role: "CarOwner" // or "Admin"
});
```

**2\. Login User**
------------------

```bash
const { data } = await axios.post("/auth/login", {
  email: "user@example.com",
  password: "password123"
});

const token = data.token;
const userId = data.id;
```

* * * * *

🚗 CAR ROUTES
=============

* * * * *

**1\. GET /api/cars -- Get ALL cars (Admin sees all, CarOwner sees all)**
========================================================================

```bash
axios.get("/cars", {
  headers: { Authorization: `Bearer ${token}` }
});
```

* * * * *

**2\. POST /api/cars -- Register a new car**
===========================================

### ✅ CarOwner registering **their OWN** car

```bash
axios.post("/cars",
  {
    model: "Tesla Model 3",
    status: "active"
  },
  {
    headers: { Authorization: `Bearer ${carOwnerToken}` }
  }
);
```

### ✅ Admin registering a car **for a specific user**

```bash
axios.post("/cars",
  {
    user_id: USER_ID,
    model: "BMW i3",
    status: "active"
  },
  {
    headers: { Authorization: `Bearer ${adminToken}` }
  }
);
```

### ❌ CarOwner registering a car for **someone else** (Should return 403)

```bash
axios.post("/cars",
  {
    user_id: 9999,          // Not allowed for CarOwner
    model: "Audi e-tron",
    status: "active"
  },
  {
    headers: { Authorization: `Bearer ${carOwnerToken}` }
  }
);
```

* * * * *

**3\. GET /api/cars/user -- Get current user's cars**
====================================================

```bash
axios.get("/cars/user", {
  headers: { Authorization: `Bearer ${carOwnerToken}` }
});
```

* * * * *

**4\. GET /api/cars/user/:userId -- Admin OR owner only**
========================================================

### ✅ Admin accessing any user

```bash
axios.get(`/cars/user/${USER_ID}`, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
```

### ✅ CarOwner accessing their own cars

```bash
axios.get(`/cars/user/${USER_ID}`, {
  headers: { Authorization: `Bearer ${carOwnerToken}` }
});
```

### ❌ CarOwner accessing someone else (Should be forbidden)

```bash
axios.get(`/cars/user/9999`, {
  headers: { Authorization: `Bearer ${carOwnerToken}` }
});
```



### To setup Psql in linux:
```bash
cd relationalDB
./initPsql.sh
```