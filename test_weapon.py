#!/usr/bin/env python3
"""Test script: simulate weapon pickup and check console logs"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import time
import os

# Just open the game in default browser
game_url = "http://localhost:8080/index.html"
print(f"Opening game at {game_url}")
webbrowser.open(game_url)
print("Game opened! Please manually test:")
print("1. Click '开始游戏'")
print("2. Select a character and click '开始闯关'")
print("3. Walk near a weapon on the ground")
print("4. Press E to pick it up")
print("5. Check if weapon appears in player's hand")
print("6. Check browser console (F12) for [Weapon] and [Player] logs")
