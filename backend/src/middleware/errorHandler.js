module.exports = (error, _req, res, _next) => {
  if (error.response) {
    const upstreamStatus = error.response.status;
    if (upstreamStatus === 404) {
      return res.status(404).json({ message: 'City or location not found' });
    }

    return res.status(upstreamStatus).json({
      message: error.response.data?.message || 'Weather provider error'
    });
  }

  if (error.message?.includes('CORS blocked')) {
    return res.status(403).json({ message: error.message });
  }

  return res.status(error.status || 500).json({
    message: error.message || 'Internal server error'
  });
};
