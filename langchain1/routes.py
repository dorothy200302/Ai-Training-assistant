# routes.py

from flask import Blueprint, render_template, request
from langchainUtils.basitQuestion import *

# 创建一个蓝图
app_routes = Blueprint('app_routes', __name__)

@app_routes.route('/', methods=['GET', 'POST'])
def index():
    itinerary = ""
    if request.method == 'POST':
        preferences = request.form.get('preferences')
        itinerary = generate_itinerary(preferences)
    return render_template('index.html', itinerary=itinerary)

@app_routes.route('/faq', methods=['GET', 'POST'])
def faq():
    answer = ""
    if request.method == 'POST':
        question = request.form.get('question')
        answer = get_answer(question)
    return render_template('faq.html', answer=answer)

@app_routes.route('/optimize', methods=['GET', 'POST'])
def optimize():
    optimized_itinerary = ""
    if request.method == 'POST':
        itinerary = request.form.get('itinerary')
        optimized_itinerary = optimize_itinerary(itinerary)
    return render_template('optimize.html', optimized_itinerary=optimized_itinerary)
