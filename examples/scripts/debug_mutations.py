#!/usr/bin/env python3
"""
Debug script to discover available GraphQL mutations
"""

import requests
import json
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configuration
GRAPHQL_ENDPOINT = "https://bzg3wm3cvrcnxnjdswzjxjju7y.appsync-api.us-east-1.amazonaws.com/graphql"
AWS_REGION = "us-east-1"

def get_aws_credentials():
    session = boto3.Session(profile_name='brain')
    credentials = session.get_credentials()
    return credentials

def introspect_schema():
    """Get the GraphQL schema to see available mutations"""
    query = """
    query IntrospectionQuery {
        __schema {
            mutationType {
                fields {
                    name
                    description
                    args {
                        name
                        type {
                            name
                            kind
                        }
                    }
                }
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
        
        if response.status_code == 200:
            result = response.json()
            mutations = result.get('data', {}).get('__schema', {}).get('mutationType', {}).get('fields', [])
            
            print("🔍 Available Mutations:")
            print("=" * 50)
            for mutation in mutations:
                name = mutation['name']
                args = [arg['name'] for arg in mutation.get('args', [])]
                print(f"• {name}({', '.join(args)})")
            
            # Look for conversation-related mutations
            conversation_mutations = [m for m in mutations if 'sousChef' in m['name'] or 'Conversation' in m['name']]
            if conversation_mutations:
                print("\n🗣️ Conversation Mutations:")
                print("-" * 30)
                for mutation in conversation_mutations:
                    print(f"• {mutation['name']}")
                    for arg in mutation.get('args', []):
                        print(f"  - {arg['name']}: {arg['type']}")
            
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    introspect_schema()
