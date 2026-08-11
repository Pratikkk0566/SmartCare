const AI_BACKEND_URL = 'https://YOUR-BACKEND-DOMAIN.com/api/ai/chat';

export async function sendMessageToAssistant(messages) {
  if (AI_BACKEND_URL.includes('YOUR-BACKEND-DOMAIN')) {
    throw new Error('Configure the SmartCare AI backend URL first.');
  }

  const response = await fetch(AI_BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
    }),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The AI service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to contact SmartCare AI.');
  }

  if (!data?.reply) {
    throw new Error('The AI service returned no reply.');
  }

  return data.reply;
}