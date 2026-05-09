from typing import List, Dict, Any

class ConversationMemory:
    def __init__(self):
        # In memory storage for demo
        self.history = {}

    def save_session(self, user_id: str, session_data: Dict[str, Any]):
        if user_id not in self.history:
            self.history[user_id] = []
        self.history[user_id].append(session_data)

    def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        return self.history.get(user_id, [])
