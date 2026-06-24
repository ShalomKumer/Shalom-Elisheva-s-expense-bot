import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ מחובר למסד הנתונים!');
  } catch (err) {
    console.error('❌ שגיאה בחיבור למסד הנתונים:', err);
    process.exit(1);
  }
}