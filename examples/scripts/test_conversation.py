#!/usr/bin/env python3
"""
Test script for full conversation flow with Arcane Kitchen AI
"""

import requests
import json
import boto3
import time
import os
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Load configuration from amplify_outputs.json
def load_amplify_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'amplify_outputs.json')
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config

config = load_amplify_config()
GRAPHQL_ENDPOINT = config['data']['url']
AWS_REGION = config['data']['aws_region']
USER_POOL_ID = config['auth']['user_pool_id']
USER_POOL_CLIENT_ID = config['auth']['user_pool_client_id']

def get_aws_credentials():
    """Get AWS credentials using boto3"""
    session = boto3.Session(profile_name='brain')
    credentials = session.get_credentials()
    return credentials

def get_cognito_token():
    """Get Cognito ID token for authentication"""
    # This would require implementing Cognito authentication flow
    # For now, we'll try to use IAM auth with proper user context
    return None

def create_conversation():
    """Create a new conversation"""
    mutation = """
    mutation CreateConversationSousChef {
        createConversationSousChef(input: {}) {
            id
            createdAt
            updatedAt
        }
    }
    """
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": mutation}),
        headers={'Content-Type': 'application/x-amz-json-1.1'}
    )
    
    SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
    
    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            data=request.body,
            headers=dict(request.headers),
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('createConversationSousChef'):
                return result['data']['createConversationSousChef']['id']
            else:
                print(f"❌ Create failed: {result}")
                return None
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def send_message(conversation_id, message):
    """Send a message to the conversation using IAM auth"""
    mutation = """
    mutation SendMessage($conversationId: ID!, $content: [AmplifyAIContentBlockInput!]!) {
        sousChef(conversationId: $conversationId, content: $content) {
            id
            content {
                text
            }
            role
            createdAt
        }
    }
    """
    
    variables = {
        "conversationId": conversation_id,
        "content": [{"text": message}]
    }
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": mutation, "variables": variables}),
        headers={'Content-Type': 'application/x-amz-json-1.1'}
    )
    
    SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
    
    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            data=request.body,
            headers=dict(request.headers),
            timeout=30
        )
        
        print(f"Raw response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('data', {}).get('sousChef'):
                return result['data']['sousChef']
            else:
                print(f"❌ Send failed: {result}")
                return None
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def get_conversation_messages(conversation_id):
    """Get all messages in a conversation"""
    query = """
    query GetConversation($id: ID!) {
        getConversationSousChef(id: $id) {
            id
            createdAt
            updatedAt
            messages {
                items {
                    id
                    role
                    createdAt
                    content {
                        text
                    }
                }
            }
        }
    }
    """
    
    variables = {"id": conversation_id}
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": query, "variables": variables}),
        headers={'Content-Type': 'application/x-amz-json-1.1'}
    )
    
    SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
    
    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            data=request.body,
            headers=dict(request.headers),
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('data', {}).get('getConversationSousChef')
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_full_conversation():
    """Test a complete conversation flow"""
    print("🔮 Testing Full Conversation Flow")
    print("=" * 50)
    print(f"📡 GraphQL Endpoint: {GRAPHQL_ENDPOINT}")
    print(f"🌍 Region: {AWS_REGION}")
    print(f"👥 User Pool: {USER_POOL_ID}")
    
    # Step 1: Create conversation
    print("\n📝 Step 1: Creating conversation...")
    conversation_id = create_conversation()
    if not conversation_id:
        print("❌ Failed to create conversation")
        return
    
    print(f"✅ Created conversation: {conversation_id}")
    
    # Step 2: Send multiple messages
    test_messages = [
        "Hi! I'm new to cooking. Can you help me?",
        "What's an easy recipe for pasta?",
        "I don't have any herbs. What can I substitute for basil?",
        "How do I know when the pasta is done cooking?"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n💬 Step {i+1}: Sending message...")
        print(f"User: {message}")
        
        response = send_message(conversation_id, message)
        if response:
            ai_response = response.get('content', [{}])[0].get('text', 'No response')
            print(f"🔮 AI: {ai_response[:100]}{'...' if len(ai_response) > 100 else ''}")
        else:
            print("❌ Failed to send message")
            break
        
        # Small delay between messages
        time.sleep(1)
    
    # Step 3: Retrieve full conversation
    print(f"\n📋 Step {len(test_messages)+2}: Retrieving full conversation...")
    conversation = get_conversation_messages(conversation_id)
    
    if conversation:
        messages = conversation.get('messages', {}).get('items', [])
        print(f"✅ Retrieved {len(messages)} messages")
        
        print("\n📜 Full Conversation History:")
        print("-" * 40)
        for msg in sorted(messages, key=lambda x: x['createdAt']):
            role = "🧑‍🍳 User" if msg['role'] == 'user' else "🔮 AI"
            content = msg.get('content', [{}])[0].get('text', 'No content')
            timestamp = msg['createdAt'][:19].replace('T', ' ')
            print(f"{timestamp} | {role}: {content[:80]}{'...' if len(content) > 80 else ''}")
    else:
        print("❌ Failed to retrieve conversation")
    
    print(f"\n🎉 Conversation test complete! ID: {conversation_id}")

if __name__ == "__main__":
    test_full_conversation()
