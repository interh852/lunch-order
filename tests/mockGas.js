// Google Apps Scriptのグローバルオブジェクトをモックします
global.Logger = {
  log: (...args) => console.log('[GAS Logger]', ...args)
};

global.Utilities = {
  formatDate: (date, tz, format) => {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    const hh = ('0' + date.getHours()).slice(-2);
    const mm = ('0' + date.getMinutes()).slice(-2);
    const ss = ('0' + date.getSeconds()).slice(-2);
    
    if (format === 'yyyy/MM/dd') return `${y}/${m}/${d}`;
    if (format === 'yyyy/MM') return `${y}/${m}`;
    if (format === 'yyyy-MM-dd HH:mm:ss') return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    return date.toString();
  }
};

global.Session = {
  getScriptTimeZone: () => 'Asia/Tokyo'
};

global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => 'mock-id-' + key
  })
};

// スプレッドシートのモック
class MockRange {
  constructor(data) { this.data = data; }
  getValue() { return Array.isArray(this.data) ? (Array.isArray(this.data[0]) ? this.data[0][0] : this.data[0]) : this.data; }
  getValues() { return this.data; }
}

class MockSheet {
  constructor(name, data, promptData = {}) {
    this.name = name;
    this.data = data;
    this.promptData = promptData;
  }
  getLastRow() { return this.data.length + 1; }
  getLastColumn() { return this.data[0] ? this.data[0].length : 10; }
  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      // getRange("B5") 形式
      return new MockRange(this.promptData[a] || '');
    }
    // getRange(row, col, numRows, numCols) 形式
    if (this.name === '情報') {
      const addr = String.fromCharCode(64 + b) + a;
      return new MockRange(this.promptData[addr] || '');
    }
    const startRow = a - 2; 
    const sliced = this.data.slice(startRow, startRow + (c || 1));
    return new MockRange(sliced);
  }
}

global.SpreadsheetApp = {
  openById: (id) => ({
    getSheetByName: (name) => {
      if (name === '情報') {
        return new MockSheet(name, [], {
          'B2': 'user@example.com', 
          'B3': 'dummy query',    
          'B4': 'gemini-1.5-flash', 
          'B5': 'dummy prompt',   
          'B6': 'xoxb-dummy',     
          'B7': 'C12345',         
          'B10': 'http://order.app',
          'B11': 'General Affairs',
          'B12': 'ga@example.com',
          'B13': 500, 'B14': 480, 'B15': 450, // 旧単価（一応）
          'B16': 'invoice query', 
          'B17': 'invoice prompt', 
          'B20': 660, 'B21': 670, 'B22': 680, 
          'B23': 640, 'B24': 650, 'B25': 660, 
          'B26': 610, 'B27': 620, 'B28': 630  
        });
      }
      if (name === '注文履歴') {
        return new MockSheet(name, [
          ['', '', 'User A', new Date(2026, 1, 1), 'Shop X', '', '小盛', 1],
          ['', '', 'User B', new Date(2026, 1, 2), 'Shop X', '', '普通', 1],
          ['', '', 'User C', new Date(2026, 1, 3), 'Shop X', '', '大盛', 1]
        ]);
      }
      return null;
    }
  })
};
