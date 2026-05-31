from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.tests import router as tests_router
from routes.submissions import router as submissions_router
from db.init import init_db

# Create the FastAPI app
app = FastAPI(title="Test Grader API")

# CORS middleware — allows the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
async def startup():
    init_db()

# Register routers
app.include_router(tests_router)
app.include_router(submissions_router)

# Health check endpoint
@app.get("/")
def root():
    return {"message": "Test Grader API is running"}