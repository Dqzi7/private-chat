const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const mongoose = require('mongoose');

const PORT = 4000;

// الرابط السحابي الخاص بك
const MONGO_URI = 'mongodb+srv://dqmoham_db_user:GDMhMVUogDvYYTFd@cluster0.13nyzua.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('=== تم الاتصال بقاعدة البيانات السحابية بنجاح ===');
        // التأكد من وجود المستخدم الأساسي dawood عند الاتصال
        await createDefaultUser();
    })
    .catch(err => console.log('خطأ في الاتصال بالقاعدة:', err));

// تعريف مخطط المستخدمين
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// دالة لإنشاء المستخدم الأساسي داود تلقائياً
async function createDefaultUser() {
    try {
        const existUser = await User.findOne({ username: 'dawood' });
        if (!existUser) {
            const defaultUser = new User({ username: 'dawood', password: '123' });
            await defaultUser.save();
            console.log('=== تم تجهيز المستخدم الأساسي: dawood كلمة المرور: 123 ===');
        } else {
            console.log('=== المستخدم الأساسي dawood مسجل مسبقاً في القاعدة ===');
        }
    } catch (e) {
        console.log('حدث خطأ أثناء إنشاء المستخدم الافتراضي');
    }
}

// تعريف مخطط الرسائل
const messageSchema = new mongoose.Schema({
    type: String,
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// جلب الرسائل المحفوظة سحابياً
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (e) {
        res.status(500).json([]);
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username: new RegExp('^'+username+'$', 'i'), password });
    
    if (user) {
        res.json({ success: true, message: 'تم الدخول بنجاح' });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور خطأ!' });
    }
});

// إضافة مستخدم جديد
app.post('/api/users/add', async (req, res) => {
    const { username, password } = req.body;
    try {
        const exists = await User.findOne({ username: new RegExp('^'+username+'$', 'i') });
        if (exists) {
            return res.json({ success: false, message: 'هذا المستخدم موجود بالفعل!' });
        }
        
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true, message: 'تم إضافة المستخدم بنجاح' });
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ أثناء الإضافة' });
    }
});

// حذف مستخدم
app.post('/api/users/delete', async (req, res) => {
    const { username } = req.body;
    try {
        const result = await User.deleteOne({ username: new RegExp('^'+username+'$', 'i') });
        if (result.deletedCount > 0) {
            res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
        } else {
            res.json({ success: false, message: 'المستخدم غير موجود!' });
        }
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

io.on('connection', (socket) => {
    console.log('مستخدم جديد اتصل بالمساحة الآمنة');

    socket.on('chat message', async (msg) => {
        try {
            const newMessage = new Message(msg);
            await newMessage.save(); // حفظ الرسالة في السحابة
            io.emit('chat message', msg);
        } catch(e) {
            console.log('خطأ في حفظ الرسالة:', e);
        }
    });

    socket.on('disconnect', () => {
        console.log('غادر مستخدم المساحة الآمنة');
    });
});

http.listen(PORT, () => {
    console.log("=== SERVER IS RUNNING ON PORT 4000 ===");
});