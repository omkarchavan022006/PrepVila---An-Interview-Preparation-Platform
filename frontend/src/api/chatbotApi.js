import api, { AI_REQUEST_TIMEOUT_MS } from './axios'

export const sendChatbotMessage = (payload) => api.post('/chatbot/message/', payload, { timeout: AI_REQUEST_TIMEOUT_MS })
export const getChatbotHistory = () => api.get('/chatbot/history/')
export const getChatbotConversation = (conversationId) => api.get(`/chatbot/conversation/${encodeURIComponent(conversationId)}/`)
export const deleteChatbotConversation = (conversationId) => api.delete(`/chatbot/conversation/${encodeURIComponent(conversationId)}/delete/`)
