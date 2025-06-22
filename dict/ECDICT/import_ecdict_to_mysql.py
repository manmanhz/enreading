#! /usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys
import time
import json
import argparse
from typing import Optional, Dict, Any, List

# Install PyMySQL as MySQLdb replacement
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    print("PyMySQL not found. Please install it with: pip install PyMySQL")
    sys.exit(1)

# Try to import stardict.py. 
# Assumes stardict.py is in the same directory or in PYTHONPATH
try:
    from stardict import DictCsv, DictMySQL, tools, stripword
except ImportError as e:
    print(f"Error importing stardict.py: {e}")
    print("Please ensure stardict.py is in the same directory as this script, or in your PYTHONPATH.")
    sys.exit(1)

# --- Configuration --- 
# These will be prompted or can be hardcoded if preferred.
DEFAULT_MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root', # Common default, change as needed
    'passwd': '',   # Prompt user for password
    'db': 'test', # Default database name
    'port': 3306 # Optional, MySQLdb defaults to 3306
}
DEFAULT_CSV_FILE_PATH = '/Users/rietsu/code/5amprojects/enreading/dict/ECDICT/stardict.csv' # Placeholder
PROGRESS_FILE = '/Users/rietsu/code/5amprojects/enreading/dict/ECDICT/import_progress.json'
DEFAULT_BATCH_SIZE = 5000  # 增加批处理大小以提高性能
MAX_RETRIES = 3  # 最大重试次数

def save_progress(start_index: int, total_count: int, imported: int, updated: int, skipped: int):
    """保存导入进度到文件"""
    progress_data = {
        'start_index': start_index,
        'total_count': total_count,
        'imported_count': imported,
        'updated_count': updated,
        'skipped_count': skipped,
        'timestamp': time.time()
    }
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save progress: {e}")

def load_progress() -> Optional[Dict[str, Any]]:
    """从文件加载导入进度"""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load progress: {e}")
    return None

def batch_insert_words(mysql_dict, word_batch: List[Dict[str, Any]], retry_count: int = 0) -> tuple:
    """批量插入单词，返回(成功数量, 失败数量)"""
    if not word_batch:
        return 0, 0
    
    success_count = 0
    failed_count = 0
    
    try:
        # 尝试批量插入
        for word_data in word_batch:
            word = word_data['word']
            items = word_data['items']
            
            try:
                if not mysql_dict.register(word, items, commit=False):
                    # 如果插入失败，尝试更新
                    existing_entry = mysql_dict.query(word)
                    if existing_entry:
                        if mysql_dict.update(word, items, commit=False):
                            success_count += 1
                        else:
                            failed_count += 1
                    else:
                        failed_count += 1
                else:
                    success_count += 1
            except Exception as e:
                print(f"Error processing word '{word}': {e}")
                failed_count += 1
        
        # 提交批次
        mysql_dict.commit()
        return success_count, failed_count
        
    except Exception as e:
        print(f"Batch insert error (attempt {retry_count + 1}): {e}")
        if retry_count < MAX_RETRIES:
            print(f"Retrying batch insert... (attempt {retry_count + 2})")
            time.sleep(2 ** retry_count)  # 指数退避
            return batch_insert_words(mysql_dict, word_batch, retry_count + 1)
        else:
            print(f"Failed to insert batch after {MAX_RETRIES} retries")
            return 0, len(word_batch)

def main(csv_file_path: str, mysql_config: Dict[str, Any], start_index: int = 0, start_word: str = None, batch_size: int = DEFAULT_BATCH_SIZE):
    # 1. Initialize DictCsv to read the CSV file
    print(f"Reading CSV file: {csv_file_path}")
    try:
        csv_dict = DictCsv(csv_file_path)
        if len(csv_dict) == 0:
            print(f"No data found in {csv_file_path}. Please check the file.")
            return
        total_words = len(csv_dict)
        print(f"Successfully read {total_words} words from CSV.")
    except FileNotFoundError:
        print(f"ERROR: CSV file not found at '{csv_file_path}'.")
        return
    except Exception as e:
        print(f"Error reading CSV file {csv_file_path}: {e}")
        return
    
    # 处理起始位置
    if start_word:
        print(f"Searching for start word: {start_word}")
        for i in range(total_words):
            word_data = csv_dict.query(i)
            if word_data and word_data.get('word') == start_word:
                start_index = i
                print(f"Found start word '{start_word}' at index {start_index}")
                break
        else:
            print(f"Warning: Start word '{start_word}' not found. Starting from index {start_index}")
    
    if start_index > 0:
        print(f"Starting import from index {start_index} (skipping first {start_index} records)")

    # 2. Initialize DictMySQL
    # The `init=True` flag in DictMySQL constructor creates the database and table if they don't exist.
    print(f"Connecting to MySQL database: {mysql_config['db']} on {mysql_config['host']}:{mysql_config['port']}")
    try:
        mysql_dict = DictMySQL(mysql_config, init=True, verbose=True)
        print("Successfully connected to MySQL and ensured table 'stardict' exists.")
    except ImportError:
        print("PyMySQL library not found.")
        print("Please install it with: pip install PyMySQL")
        return
    except Exception as e:
        print(f"Error connecting to MySQL or initializing database: {e}")
        return

    # 3. Transfer data
    print("Starting data import from CSV to MySQL...")
    
    # 加载之前的进度（如果存在）
    previous_progress = load_progress()
    if previous_progress and start_index == 0 and not start_word:
        print(f"Found previous progress: {previous_progress}")
        resume = input("Do you want to resume from previous progress? (y/n): ").strip().lower()
        if resume == 'y':
            start_index = previous_progress.get('start_index', 0)
            print(f"Resuming from index {start_index}")
    
    progress_indicator = tools.progress(total_words - start_index)
    imported_count = 0
    updated_count = 0
    skipped_count = 0
    
    # 批量处理
    word_batch = []
    batch_count = 0
    
    print(f"Processing {total_words - start_index} records with batch size {batch_size}")
    
    for i in range(start_index, total_words):
        word_data_csv = None # Ensure it's defined for the except block
        try:
            word_data_csv = csv_dict.query(i) 
            if not word_data_csv or not word_data_csv.get('word'):
                skipped_count += 1
                progress_indicator.next()
                continue

            word_to_register = word_data_csv['word']
            
            items_for_mysql = {
                'phonetic': word_data_csv.get('phonetic'),
                'definition': word_data_csv.get('definition'),
                'translation': word_data_csv.get('translation'),
                'pos': word_data_csv.get('pos'),
                'collins': word_data_csv.get('collins'),
                'oxford': word_data_csv.get('oxford'),
                'tag': word_data_csv.get('tag'),
                'bnc': word_data_csv.get('bnc'),
                'frq': word_data_csv.get('frq'),
                'exchange': word_data_csv.get('exchange'),
                'detail': word_data_csv.get('detail'), 
                'audio': word_data_csv.get('audio')
            }
            
            for field in ['collins', 'oxford', 'bnc', 'frq']:
                value = items_for_mysql.get(field)
                if isinstance(value, str) and (value == '' or value == '0'):
                    items_for_mysql[field] = None
                elif isinstance(value, (int, float)) and value == 0:
                     items_for_mysql[field] = None

            # 添加到批次中
            word_batch.append({
                'word': word_to_register,
                'items': items_for_mysql
            })
            
            progress_indicator.next()

            # 当批次达到指定大小时，执行批量插入
            if len(word_batch) >= batch_size:
                batch_count += 1
                print(f"Processing batch {batch_count} (records {i-len(word_batch)+1} to {i})")
                
                batch_imported, batch_failed = batch_insert_words(mysql_dict, word_batch)
                imported_count += batch_imported
                skipped_count += batch_failed
                
                # 保存进度
                save_progress(i + 1, total_words, imported_count, updated_count, skipped_count)
                
                # 清空批次
                word_batch = []
                
                print(f"Batch {batch_count} completed. Total: imported={imported_count}, skipped={skipped_count}")
        
        except Exception as e:
            current_word = word_data_csv.get('word', 'UNKNOWN_WORD_AT_CSV_INDEX_' + str(i)) if word_data_csv else 'UNKNOWN_WORD_AT_CSV_INDEX_' + str(i)
            print(f"Error processing word '{current_word}': {e}")
            skipped_count += 1
            progress_indicator.next()
            
            # 检查是否是连接已关闭的错误
            if "Already closed" in str(e) or "'Connection' object has no attribute" in str(e):
                try:
                    print("MySQL connection lost. Attempting to reconnect...")
                    mysql_dict._DictMySQL__open(force_init=False)
                    print("Successfully reconnected to MySQL.")
                except Exception as reconnect_error:
                    print(f"Failed to reconnect: {reconnect_error}")
                    break

    # 处理剩余的批次
    if word_batch:
        batch_count += 1
        print(f"Processing final batch {batch_count} ({len(word_batch)} remaining records)")
        batch_imported, batch_failed = batch_insert_words(mysql_dict, word_batch)
        imported_count += batch_imported
        skipped_count += batch_failed
        print(f"Final batch completed. Total: imported={imported_count}, skipped={skipped_count}")
    
    progress_indicator.done()
    print(f"Import complete. Imported: {imported_count}, Updated: {updated_count}, Skipped/Failed: {skipped_count}")
    
    # 清理进度文件
    try:
        if os.path.exists(PROGRESS_FILE):
            os.remove(PROGRESS_FILE)
            print("Progress file cleaned up.")
    except Exception as e:
        print(f"Warning: Failed to clean up progress file: {e}")
    
    print("Process finished.")

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='ECDICT CSV to MySQL Importer with resume capability')
    parser.add_argument('--csv-path', default=DEFAULT_CSV_FILE_PATH, help='Path to the ECDICT CSV file')
    parser.add_argument('--start-index', type=int, default=0, help='Start from specific index (0-based)')
    parser.add_argument('--start-word', type=str, help='Start from specific word')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE, help='Batch size for processing')
    parser.add_argument('--host', default=DEFAULT_MYSQL_CONFIG['host'], help='MySQL host')
    parser.add_argument('--user', default=DEFAULT_MYSQL_CONFIG['user'], help='MySQL user')
    parser.add_argument('--password', default=DEFAULT_MYSQL_CONFIG['passwd'], help='MySQL password')
    parser.add_argument('--database', default=DEFAULT_MYSQL_CONFIG['db'], help='MySQL database')
    parser.add_argument('--port', type=int, default=DEFAULT_MYSQL_CONFIG['port'], help='MySQL port')
    parser.add_argument('--interactive', action='store_true', help='Use interactive mode for configuration')
    return parser.parse_args()

if __name__ == '__main__':
    print("--- ECDICT CSV to MySQL Importer (Enhanced Version) ---")
    print("Features: Batch processing, Resume capability, Progress tracking")
    print("REMINDER: This script assumes you have ALREADY EXTRACTED the CSV data")
    print(f"from '/Users/rietsu/code/5amprojects/enreading/dict/ECDICT/stardict.7z'.")
    print("Make sure 'stardict.py' is in the same directory or your PYTHONPATH.")
    print("If you haven't installed PyMySQL: pip install PyMySQL\n")
    
    args = parse_arguments()
    
    if args.interactive:
        # 交互模式
        csv_path_input = input(f"Enter the full path to the extracted ECDICT CSV file (default: {args.csv_path}): ").strip()
        if not csv_path_input:
            csv_path_input = args.csv_path
            print(f"Using default: {csv_path_input}")
        
        if not os.path.exists(csv_path_input):
            print(f"\nERROR: CSV file not found at '{csv_path_input}'. Please check the path and try again.")
            sys.exit(1)
            
        current_mysql_config = {
            'host': input(f"MySQL Host (default: {args.host}): ").strip() or args.host,
            'user': input(f"MySQL User (default: {args.user}): ").strip() or args.user,
            'passwd': input(f"MySQL Password (default: {args.password}): ").strip() or args.password,
            'db': input(f"MySQL Database name (default: {args.database}): ").strip() or args.database,
        }
        
        port_input = input(f"MySQL Port (default: {args.port}): ").strip()
        if port_input:
            try:
                current_mysql_config['port'] = int(port_input)
            except ValueError:
                print(f"Invalid port number '{port_input}'. Using default {args.port}.")
                current_mysql_config['port'] = args.port
        else:
            current_mysql_config['port'] = args.port
        
        start_index_input = input(f"Start index (default: {args.start_index}): ").strip()
        start_index = int(start_index_input) if start_index_input else args.start_index
        
        start_word_input = input(f"Start word (optional): ").strip()
        start_word = start_word_input if start_word_input else args.start_word
        
        batch_size_input = input(f"Batch size (default: {args.batch_size}): ").strip()
        batch_size = int(batch_size_input) if batch_size_input else args.batch_size
        
    else:
        # 命令行模式
        csv_path_input = args.csv_path
        if not os.path.exists(csv_path_input):
            print(f"\nERROR: CSV file not found at '{csv_path_input}'. Please check the path and try again.")
            sys.exit(1)
            
        current_mysql_config = {
            'host': args.host,
            'user': args.user,
            'passwd': args.password,
            'db': args.database,
            'port': args.port
        }
        
        start_index = args.start_index
        start_word = args.start_word
        batch_size = args.batch_size
    
    print(f"\nConfiguration:")
    print(f"  CSV file: {csv_path_input}")
    print(f"  MySQL: {current_mysql_config['user']}@{current_mysql_config['host']}:{current_mysql_config['port']}/{current_mysql_config['db']}")
    print(f"  Start index: {start_index}")
    print(f"  Start word: {start_word or 'None'}")
    print(f"  Batch size: {batch_size}")
    print()

    main(csv_path_input, current_mysql_config, start_index, start_word, batch_size)