from datetime import datetime
import time


def now_time():
    Time = time.time()
    datetime_obj = datetime.fromtimestamp(Time)
    formatted_date = datetime_obj.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    return formatted_date


def today():
    Time = time.time()
    datetime_obj = datetime.fromtimestamp(Time)
    formatted_date = datetime_obj.strftime("%Y-%m-%d")
    return formatted_date


def day():
    Time = time.time()
    datetime_obj = datetime.fromtimestamp(Time)
    formatted_date = datetime_obj.strftime("%d")
    return formatted_date


def year():
    Time = time.time()
    datetime_obj = datetime.fromtimestamp(Time)
    formatted_date = datetime_obj.strftime("%Y")
    return formatted_date


def moon():
    Time = time.time()
    datetime_obj = datetime.fromtimestamp(Time)
    formatted_date = datetime_obj.strftime("%m")
    return formatted_date
