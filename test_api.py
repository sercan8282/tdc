import requests
import json

# Login
login_response = requests.post(
    'http://localhost:8000/api/auth/token/login/',
    json={'email': 'admin@example.com', 'password': 'admin123'}
)
print('Login response:', login_response.status_code)
token = login_response.json()['auth_token']
print('Token:', token)

# Get user
user_response = requests.get(
    'http://localhost:8000/api/auth/users/me/',
    headers={'Authorization': f'Token {token}'}
)
print('\nUser response:', user_response.status_code)
print('User data:', json.dumps(user_response.json(), indent=2))
