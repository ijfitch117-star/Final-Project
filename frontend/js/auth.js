//auth.js
// Base URL for all API requests
// In production, change this to your live domain e.g. 'https://yoursite.com/api'
const API_URL = 'https://final-project-ob7x.onrender.com/api' // make sure to change this later

// ===== REGISTER =====
// Grab the register form — will be null on the login page so we check before using it
const registerForm = document.getElementById('registerForm')
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    
    // Prevent the form from doing its default behavior (refreshing the page)
    e.preventDefault()

    // Read the values the user typed into the input fields
    const name = document.getElementById('name').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    try {
      // Send a POST request to /api/users with the form data as JSON
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // tell the server we are sending JSON
        body: JSON.stringify({ name, email, password })  // convert JS object to a JSON string
      })

      // Parse the JSON response body from the server
      const data = await res.json()

      if (!res.ok) {
        // res.ok is false when the status is 4xx or 5xx
        // show the error message returned by the server (e.g. 'User already exists')
        document.getElementById('errorMsg').textContent = data.message || 'Registration failed'
        return
      }

      // Registration was successful — show a message then redirect to login after 1.5 seconds
      document.getElementById('successMsg').textContent = 'Registered! Redirecting to login...'
      setTimeout(() => window.location.href = 'index.html#login', 1500)

    } catch (err) {
      // This catch block runs if fetch itself failed — e.g. backend server is not running
      document.getElementById('errorMsg').textContent = 'Could not connect to server'
    }
  })
}

// ===== LOGIN =====
// Grab the login form — will be null on the register page so we check before using it
const loginForm = document.getElementById('loginForm')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    // Prevent page refresh on form submit
    e.preventDefault()

    // Read the values the user typed into the input fields
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    try {
      // Send a POST request to /api/users/login with email and password
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      // Parse the JSON response body
      const data = await res.json()

      if (!res.ok) {
        // Show the server error message (e.g. 'Invalid credentials')
        document.getElementById('errorMsg').textContent = data.message || 'Login failed'
        return
      }

      // Save the JWT token in localStorage so we can attach it to every future service request
      // Without this token, the backend will reject requests with 401 Unauthorized
      localStorage.setItem('token', data.token)

      // Redirect to the dashboard where the user can manage their services
      window.location.href = 'dashboard.html'

    } catch (err) {
      // Fetch failed — backend is likely not running
      document.getElementById('errorMsg').textContent = 'Could not connect to server'
    }
  })
}