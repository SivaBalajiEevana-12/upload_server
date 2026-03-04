const express = require('express');
const connectDB = require('./models/db');
// const donorRoutes = require('./routes/donorRoutes');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const Donor = require('./models/donor');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
app.use(cors())

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });


app.post("/upload-donors", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ✅ Read Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    let data = XLSX.utils.sheet_to_json(sheet);

    // ✅ Transform
    data = data.map((row) => ({
      receiptNumber: row.ReceiptNumber,
      receiptDate: row.ReceiptDate ? new Date(row.ReceiptDate) : null,
      amount: Number(row.Amount),
      enrolledBy: row.EnrolledBy,
      donorId: row.DonorID,
      donorName: row.DonorName,
      mobileNumber: String(row.MobileNumber).trim(),
      sevaSubCategoryCode: row.SevaSubCategoryCode,
      type: row.Type,
    }));

    await Donor.deleteMany({});

    await Donor.insertMany(data);

    res.json({
      message: "Donor data uploaded successfully",
      count: data.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
});

app.get("/donors-by-mobile/:mobile", async (req, res) => {
  try {
    const mobile = req.params.mobile.trim();

    const donors = await Donor.find({
      mobileNumber: mobile,
    }).sort({ receiptDate: -1 });

    if (!donors.length) {
      return res.status(404).json({ message: "No records found" });
    }

    res.json(donors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching donors" });
  }
});
/* ===============================
   📋 Get all donors (for webpage)
================================*/
app.get("/donors", async (req, res) => {
  try {
    const donors = await Donor.find()
      .sort({ receiptDate: -1 })
      .limit(500); // safety limit

    res.json(donors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching donors" });
  }
});
app.put("/attendance/:mobile", async (req, res) => {
  try {
    const mobile = req.params.mobile.trim();

    const donor = await Donor.findOne({ mobileNumber: mobile });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Mobile number not found",
      });
    }

    if (donor.attendance) {
      return res.status(200).json({
        success: true,
        message: "Attendance already marked",
        donor,
      });
    }

    donor.attendance = true;
    await donor.save();

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      donor,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating attendance",
    });
  }
});
// const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
