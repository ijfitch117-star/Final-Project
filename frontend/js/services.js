
//services.js
// Base URL for all API requests
// In production, change this to your live domain e.g. 'https://yoursite.com/api'
const API_URL = 'https://final-project-ob7x.onrender.com/api' // dont forget to change this later

// ===== PROTECT THE PAGE =====
// Read the token that was saved to localStorage when the user logged in
const token = localStorage.getItem('token')

// If there is no token, the user is not logged in — send them back to the login page
if (!token) {
  window.location.href = 'index.html'
  throw new Error('No token') // stops the rest of the script from running

}

// ===== AUTH HEADER HELPER =====
// Every request to a protected route must include the JWT token in the Authorization header
// This function returns the headers object so we don't repeat it everywhere
function authHeader() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // format required by our authMiddleware.js
  }
}

// ===== LOGOUT =====
// When logout is clicked, remove the token from localStorage and go back to login
// Without the token, the user can no longer make authenticated requests
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token')
  window.location.href = 'index.html'
})

// ===== GET ALL SERVICES =====
async function getServices() {
  // GET /api/services — protected route, needs Authorization header
  const res = await fetch(`${API_URL}/services`, {
    method: 'GET',
    headers: authHeader()
  })

  const services = await res.json()

  if (!res.ok) {
    // If the request failed, show the error in the services container
    document.getElementById('servicesList').textContent = services.message || 'Failed to load services'
    return
  }

  // Pass the services array to the render function to display them on the page
  renderServices(services)
}

// ===== RENDER SERVICES TO THE PAGE =====
function renderServices(services) {
  const container = document.getElementById('servicesList')

  // Clear whatever was previously rendered so we don't get duplicates
  container.innerHTML = ''

  if (services.length === 0) {
    container.textContent = 'No services yet. Add one above!'
    return
  }

  // Loop through each service and create HTML elements for it
  services.forEach(service => {
    const div = document.createElement('div')
    div.classList.add('service')
    
    div.innerHTML = `
      <p><strong>ID:</strong> ${service.id}</p>
      <p><strong>Name:</strong> ${service.name}</p>
      <p><strong>Price:</strong> $${service.price}</p>
      <p><strong>Description:</strong> ${service.description || ''}</p>
      <hr>
      <button onclick="startEdit(
        '${service.id}',
        '${String(service.name).replace(/'/g, "\\'")}',
        '${service.price}',
        '${String(service.description || '').replace(/'/g, "\\'")}'
      )">Edit</button>
      <button onclick="deleteService('${service.id}')">Delete</button>
    `
    container.appendChild(div)
  })
}

// ===== CREATE A SERVICE =====
document.getElementById('createServiceForm').addEventListener('submit', async (e) => {
  // Prevent page refresh on form submit
  e.preventDefault()

  const name = document.getElementById('name').value
  const price = document.getElementById('price').value
  const description = document.getElementById('description').value

  // POST /api/services — sends the service text in the request body
  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ 
      name,
      price: Number(price),
      description
    })
  })

  const data = await res.json()

  if (!res.ok) {
    // Show the error (e.g. "Please add a 'text' field")
    document.getElementById('createMsg').style.color = 'red'
    document.getElementById('createMsg').textContent = data.message || 'Failed to create service'
    return
  }

  // Show success message, clear the input, and refresh the services list
  document.getElementById('createMsg').style.color = 'green'
  document.getElementById('createMsg').textContent = 'Service created!'
  document.getElementById('createServiceForm').reset()
  getServices()
})

// ===== DELETE A SERVICE =====
async function deleteService(id) {
  // Ask the user to confirm before permanently deleting
  const confirmed = confirm('Are you sure you want to delete this service?')
  if (!confirmed) return

  // DELETE /api/services/:id — the id is in the URL, no request body needed
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
    headers: authHeader()
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.message || 'Failed to delete service')
    return
  }

  // Refresh the list so the deleted service disappears
  getServices()
}

// ===== SHOW EDIT FORM =====
// Called when the user clicks the Edit button on a service
// Populates the hidden edit section with the current service's id and text
function startEdit(id, currentName, currentPrice, currentDescription) {
  document.getElementById('editSection').style.display = 'block'

  document.getElementById('editServiceId').value = id         // store id in hidden input
  document.getElementById('editName').value = currentName // pre-fill with current text
  document.getElementById('editPrice').value = currentPrice
  document.getElementById('editDescription').value = currentDescription

  document.getElementById('editMsg').textContent = ''       // clear any previous messages
  // Scroll the edit section into view so the user doesn't have to scroll manually
  document.getElementById('editSection').scrollIntoView()
}

// ===== CANCEL EDIT =====
// Hide the edit form without making any changes
document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editSection').style.display = 'none'
})

// ===== SAVE EDIT =====
document.getElementById('saveEditBtn').addEventListener('click', async () => {
  // Read the service id (from the hidden input) and the updated text
  const id = document.getElementById('editServiceId').value
  const name = document.getElementById('editName').value
  const price = document.getElementById('editPrice').value
  const description = document.getElementById('editDescription').value

  // PUT /api/services/:id — sends the updated text in the request body
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ 
      name,
      price: Number(price),
      description
     })
  })

  const data = await res.json()

  if (!res.ok) {
    document.getElementById('editMsg').style.color = 'red'
    document.getElementById('editMsg').textContent = data.message || 'Failed to update service'
    return
  }

  // Show success, hide the edit form, and refresh the services list
  document.getElementById('editMsg').style.color = 'green'
  document.getElementById('editMsg').textContent = 'Service updated!'
  document.getElementById('editSection').style.display = 'none'
  getServices()
})

// ===== LOAD SERVICES ON PAGE LOAD =====
// Automatically fetch and display all services when dashboard.html is opened
getServices()