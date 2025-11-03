from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
import requests

indexPage = Blueprint('indexPage', __name__)

@indexPage.route('/ApiTest', methods=['get'])
def ApiTest():
    return jsonify({"message": "API is running successfully!"}), 200