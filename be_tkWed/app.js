const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const os = require('os');

const app = express();
const port = 3000;

// Hàm lấy địa chỉ IP động
function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    for (const iface of Object.values(networkInterfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1'; // Nếu không tìm thấy IP nào khác
}

const localIP = getLocalIPAddress();

app.use(cors({
    origin: '*', // Cho phép tất cả origin truy cập
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Cấu hình kết nối SQL
const config = {
    user: 'sa',
    password: '123456',
    server: 'DESKTOP-4HOPURA\\SQLEXPRESS',
    database: 'TravelBooking',
    options: {
        trustServerCertificate: true,
    },
};

let pool;

// Hàm kết nối SQL Server
async function connectToSQL() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log('Connected to SQL Server');
        }
    } catch (err) {
        console.error('Error connecting to SQL Server:', err);
        throw err;
    }
}

// Middleware kiểm tra kết nối SQL
async function ensureSQLConnection(req, res, next) {
    try {
        await connectToSQL();
        next();
    } catch (err) {
        res.status(500).send('Unable to connect to SQL Server');
    }
}

app.use(ensureSQLConnection);

// API lấy danh sách tất cả các tour
app.get('/api/Tours', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM Tours');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send(err.message);
    }
});

// API lấy thông tin chi tiết tour theo ID
app.get('/api/Tours/:id', async (req, res) => {
    const tourId = req.params.id;

    try {
        const result = await pool.request()
            .input('TourID', sql.Int, tourId)
            .query('SELECT * FROM Tours WHERE TourID = @TourID');

        if (result.recordset.length === 0) {
            return res.status(404).send('Tour not found');
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send(err.message);
    }
});

// API cập nhật thông tin tour
app.put('/api/Tours/:id', async (req, res) => {
    const tourId = req.params.id;
    const {
        TourName, Description, Destination, Itinerary, Highlights,
        StartDate, EndDate, Price, AvailableSeats, TourType, ImageURL, Rating, ReviewsCount,
    } = req.body;

    try {
        const result = await pool.request()
            .input('TourID', sql.Int, tourId)
            .input('TourName', sql.NVarChar, TourName)
            .input('Description', sql.NVarChar, Description)
            .input('Destination', sql.NVarChar, Destination)
            .input('Itinerary', sql.NVarChar, Itinerary)
            .input('Highlights', sql.NVarChar, Highlights)
            .input('StartDate', sql.DateTime, StartDate)
            .input('EndDate', sql.DateTime, EndDate)
            .input('Price', sql.Money, Price)
            .input('AvailableSeats', sql.Int, AvailableSeats)
            .input('TourType', sql.NVarChar, TourType)
            .input('ImageURL', sql.NVarChar, ImageURL)
            .input('Rating', sql.Float, Rating)
            .input('ReviewsCount', sql.Int, ReviewsCount)
            .query(`
                UPDATE Tours 
                SET 
                    TourName = @TourName, Description = @Description, Destination = @Destination,
                    Itinerary = @Itinerary, Highlights = @Highlights, StartDate = @StartDate, 
                    EndDate = @EndDate, Price = @Price, AvailableSeats = @AvailableSeats,
                    TourType = @TourType, ImageURL = @ImageURL, Rating = @Rating, ReviewsCount = @ReviewsCount
                WHERE TourID = @TourID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Tour not found');
        }

        res.send('Tour updated successfully');
    } catch (err) {
        console.error('Error updating tour:', err.stack);
        res.status(500).send('Error updating tour: ' + err.message);
    }
});
app.post('/api/Tours', async (req, res) => {
    const {
        TourName, Description, Destination, Itinerary, Highlights,
        StartDate, EndDate, Price, AvailableSeats, TourType, ImageURL, Rating, ReviewsCount,
    } = req.body;

    try {
        // Insert query
        const result = await pool.request()
            .input('TourName', sql.NVarChar, TourName)
            .input('Description', sql.NVarChar, Description)
            .input('Destination', sql.NVarChar, Destination)
            .input('Itinerary', sql.NVarChar, Itinerary)
            .input('Highlights', sql.NVarChar, Highlights)
            .input('StartDate', sql.DateTime, StartDate)
            .input('EndDate', sql.DateTime, EndDate)
            .input('Price', sql.Money, Price)
            .input('AvailableSeats', sql.Int, AvailableSeats)
            .input('TourType', sql.NVarChar, TourType)
            .input('ImageURL', sql.NVarChar, ImageURL)
            .input('Rating', sql.Float, Rating)
            .input('ReviewsCount', sql.Int, ReviewsCount)
            .query(`
                INSERT INTO Tours (
                    TourName, Description, Destination, Itinerary, Highlights, StartDate, EndDate, Price, 
                    AvailableSeats, TourType, ImageURL, Rating, ReviewsCount
                )
                VALUES (
                    @TourName, @Description, @Destination, @Itinerary, @Highlights, @StartDate, @EndDate, @Price, 
                    @AvailableSeats, @TourType, @ImageURL, @Rating, @ReviewsCount
                )
            `);

        // If the insertion was successful, send a success response
        res.status(201).send('New tour added successfully');
    } catch (err) {
        console.error('Error adding new tour:', err.stack);
        res.status(500).send('Error adding new tour: ' + err.message);
    }
});
// API xóa tour
app.delete('/api/Tours/:id', async (req, res) => {
    const tourId = req.params.id;

    try {
        await pool.request()
            .input('TourID', sql.Int, tourId)
            .query('DELETE FROM Tours WHERE TourID = @TourID');

        res.send('Tour deleted successfully');
    } catch (err) {
        console.error('Error deleting tour:', err);
        res.status(500).send(err.message);
    }
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Lắng nghe tại địa chỉ IP cục bộ
app.listen(port, localIP, () => {
    console.log(`Server is running at http://${localIP}:${port}`);
});
