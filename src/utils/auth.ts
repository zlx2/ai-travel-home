export const TOKEN_KEY = 'AI_TRAVEL_TOKEN'
export const USER_KEY = 'AI_TRAVEL_USER'

export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
