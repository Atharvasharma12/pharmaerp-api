import dotenv from "dotenv";

dotenv.config();

import connectDB from "../src/config/database.js";
import logger from "../src/config/logger.js";

import PlatformUser from "../src/modules/platform/users/models/platformUser.model.js";

import PLATFORM_ROLES from "../src/constants/platformRoles.constant.js";
import PLATFORM_USER_STATUS from "../src/constants/platformStatus.constant.js";

const seedPlatformUser = async () => {
  try {
    await connectDB();

    const adminData = {
      name: process.env.PLATFORM_ADMIN_NAME || "Super Admin",

      email: process.env.PLATFORM_ADMIN_EMAIL || "admin@platform.com",

      password: process.env.PLATFORM_ADMIN_PASSWORD || "123456",

      role: PLATFORM_ROLES.SUPER_ADMIN,

      status: PLATFORM_USER_STATUS.ACTIVE,
    };

    const existingAdmin = await PlatformUser.findOne({
      email: adminData.email.toLowerCase(),
      isDeleted: false,
    });

    if (existingAdmin) {
      logger.info(`Platform admin already exists: ${adminData.email}`);

      process.exit(0);
    }

    const platformAdmin = await PlatformUser.create(adminData);

    logger.info("Platform super admin created successfully");
    logger.info(`Email: ${platformAdmin.email}`);
    logger.info(`Password: ${adminData.password}`);

    process.exit(0);
  } catch (error) {
    logger.error(`Failed to seed platform user: ${error.message}`);

    process.exit(1);
  }
};

seedPlatformUser();
