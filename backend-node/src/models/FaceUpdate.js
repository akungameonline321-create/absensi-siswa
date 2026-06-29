const { mongoose } = require("../config/db.mongo");

const faceUpdateSchema = new mongoose.Schema(
  {
    student_id: { type: Number, required: true },
    nis: { type: String, required: true },
    nama_siswa: { type: String, required: true },
    kelas_id: { type: Number, required: true },
    nama_kelas: { type: String, required: true },
    photo_path: { type: String, required: true, comment: "Path foto wajah yang baru" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approved_by: { type: Number, default: null }, // ID Admin/Guru
  },
  { timestamps: true, collection: "face_updates" }
);

const FaceUpdate = mongoose.model("FaceUpdate", faceUpdateSchema);
module.exports = FaceUpdate;
