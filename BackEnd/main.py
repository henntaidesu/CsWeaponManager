import os
from flask import Flask
from flask_cors import CORS
from src.config.config_v1 import configV1
from src.web_side.youpin898.buy.buy_v1 import youpin898BuyV1
from src.web_side.youpin898.lent.lent_v1 import youpin898LentV1
from src.web_side.youpin898.sell.sell_v1 import youpin898SellV1
from src.web_side.youpin898.message.message_v1 import youpin898MessageBoxV1
from src.web_side.youpin898.select_weapon.select_weapon_v1 import youpin898SelectWeaponV1
from src.web_side.webSide.web.index_page import indexPage
from src.web_side.webSide.web.buy_page import webBuyV1
from src.web_side.webSide.web.sell_page import webSellV1
from src.web_side.webSide.web.lent import webLentV1
from src.web_side.webSide.web.select_weapon import webSelectWeaponV1
from src.web_side.webSide.DataSource_page import dataSourcePage
from src.web_side.buff163.buy import buff163BuyV1
from src.web_side.buff163.sell import buff163SellV1
from src.web_side.buff163.select_weapon import buff163SelectWeaponV1
from src.web_side.steam.market import steamMarketV1
from src.web_side.steam.steam_inventory_history_api import steamInventoryHistoryV1
from src.web_side.steam.inventory import steamInventoryV1
from src.web_side.steam.select_weapon_hash_name import steamSelectWeaponHashNameV1
from src.web_side.webSide.steamMarket import webSteamMarketV1
from src.web_side.webSide.steamInventoryHistory import webSteamInventoryHistoryV1
from src.web_side.webSide.buy_page import webBuyPageV1
from src.web_side.webSide.sell_page import webSellPageV1
from src.web_side.webSide.lent_page import webLentPageV1
from src.web_side.webSide.inventory import webInventoryV1
from src.web_side.webSide.stock_components import webStockComponentsV1
from src.web_side.prefectWorld.prefectworld_config import prefectWorldConfigV1
from src.web_side.prefectWorld.stock_components_api import prefectWorldStockComponentsV1
from src.db_manager import init_database

app = Flask(__name__)
CORS(app)

def main():
    # print("Blank End API Start")
    # 只在主进程中初始化数据库，避免Flask debug模式重复初始化
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        # 初始化数据库
        if not init_database():
            print("❌ 数据库初始化失败，程序退出")
            return
    
    app.register_blueprint(configV1, url_prefix = '/configV1')
    app.register_blueprint(youpin898BuyV1, url_prefix = '/youpin898BuyV1')
    app.register_blueprint(youpin898SellV1, url_prefix = '/youpin898SellV1')
    app.register_blueprint(youpin898LentV1, url_prefix = '/youpin898LentV1')
    app.register_blueprint(youpin898MessageBoxV1, url_prefix = '/youpin898MessageBoxV1')
    app.register_blueprint(youpin898SelectWeaponV1, url_prefix = '/youpin898SelectWeaponV1')
    app.register_blueprint(indexPage, url_prefix = '/indexPage')
    app.register_blueprint(webBuyV1, url_prefix = '/webBuyV1')
    app.register_blueprint(webSellV1, url_prefix = '/webSellV1')
    app.register_blueprint(webLentV1, url_prefix = '/webLentV1')
    app.register_blueprint(webSelectWeaponV1, url_prefix = '/webSelectWeaponV1')
    app.register_blueprint(dataSourcePage, url_prefix='/dataSourcePageV1')
    app.register_blueprint(buff163BuyV1, url_prefix = '/buff163BuyV1')
    app.register_blueprint(buff163SellV1, url_prefix = '/buff163SellV1')
    app.register_blueprint(buff163SelectWeaponV1, url_prefix = '/buff163SelectWeaponV1')
    app.register_blueprint(steamMarketV1, url_prefix = '/steamMarketV1')
    app.register_blueprint(steamInventoryHistoryV1, url_prefix = '/steamInventoryHistoryV1')
    app.register_blueprint(steamInventoryV1, url_prefix = '/api/v1/steam')
    app.register_blueprint(steamSelectWeaponHashNameV1, url_prefix = '/steamSelectWeaponHashNameV1')
    app.register_blueprint(webSteamMarketV1, url_prefix = '/webSteamMarketV1')
    app.register_blueprint(webSteamInventoryHistoryV1, url_prefix = '/webSteamInventoryHistoryV1')
    app.register_blueprint(webBuyPageV1, url_prefix = '/webBuyPageV1')
    app.register_blueprint(webSellPageV1, url_prefix = '/webSellPageV1')
    app.register_blueprint(webLentPageV1, url_prefix = '/webLentPageV1')
    app.register_blueprint(webInventoryV1, url_prefix = '/webInventoryV1')
    app.register_blueprint(webStockComponentsV1, url_prefix = '/webStockComponentsV1')
    app.register_blueprint(prefectWorldConfigV1, url_prefix = '/prefectWorldConfigV1')
    app.register_blueprint(prefectWorldStockComponentsV1, url_prefix = '/prefectWorldStockComponentsV1')
    app.run(debug=True, port=9001, host='0.0.0.0')

if __name__ == '__main__':
    main()

