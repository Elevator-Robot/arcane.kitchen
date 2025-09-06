#!/usr/bin/env python3
"""
Test script for Arcane Kitchen GraphQL conversation API
"""

import requests
import json
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configuration from amplify_outputs.json
GRAPHQL_ENDPOINT = "https://bzg3wm3cvrcnxnjdswzjxjju7y.appsync-api.us-east-1.amazonaws.com/graphql"
AWS_REGION = "us-east-1"

def get_aws_credentials():
    """Get AWS credentials using boto3"""
    session = boto3.Session(profile_name='brain')
    credentials = session.get_credentials()
    return credentials

def get_conversation(conversation_id):
    """Get conversation by ID"""
    query = """
    query GetConversationSousChef($id: ID!) {
        getConversationSousChef(id: $id) {
            id
            createdAt
            updatedAt
            messages {
                items {
                    id
                    role
                    createdAt
                    conversationId
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
        
        print(f"Status: {response.status_code}")
        
        if response.text:
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                return result
            except json.JSONDecodeError:
                print(f"Raw Response: {response.text}")
        else:
            print("Empty response")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def list_conversations():
    """List all conversations"""
    query = """
    query ListConversationSousChefs {
        listConversationSousChefs {
            items {
                id
                createdAt
                updatedAt
            }
        }
    }
    """
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": query}),
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
        
        print(f"Status: {response.status_code}")
        
        if response.text:
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                return result
            except json.JSONDecodeError:
                print(f"Raw Response: {response.text}")
        else:
            print("Empty response")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("🔮 Testing Arcane Kitchen GraphQL Conversation API")
    print("=" * 50)
    
    # List all conversations first
    print("\n📜 Listing all conversations...")
    list_conversations()
    
    # Get specific conversation
    conversation_id = "97b40f29-8252-4c54-b481-1632d5a66d60"
    print(f"\n🗣️ Getting conversation {conversation_id}...")
    get_conversation(conversation_id)
